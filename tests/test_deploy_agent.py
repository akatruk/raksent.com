import io
import os
import tarfile
import tempfile
import time
import unittest
from importlib.machinery import SourceFileLoader
from unittest import mock
from importlib.util import module_from_spec, spec_from_loader
from pathlib import Path

AGENT_PATH = Path(__file__).resolve().parents[1] / "infrastructure" / "ansible" / "files" / "raksent-deploy"
loader = SourceFileLoader("raksent_deploy", str(AGENT_PATH))
agent = module_from_spec(spec_from_loader("raksent_deploy", loader))
loader.exec_module(agent)

COMMIT = "0123456789abcdef0123456789abcdef01234567"
TOP = f"raksent.com-{COMMIT}"


def build_archive(path, entries, comment=COMMIT):
    with tarfile.open(path, "w:gz", format=tarfile.PAX_FORMAT, pax_headers={"comment": comment}) as tar:
        for name, kind, payload in entries:
            info = tarfile.TarInfo(name)
            if kind == "dir":
                info.type, info.mode = tarfile.DIRTYPE, 0o775
                tar.addfile(info)
            elif kind == "link":
                info.type, info.linkname = tarfile.SYMTYPE, payload
                tar.addfile(info)
            else:
                data = payload.encode()
                info.size, info.mode = len(data), 0o775 if kind == "exec" else 0o664
                tar.addfile(info, io.BytesIO(data))


class ExtractTest(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory()
        self.root = Path(self.workspace.name)
        self.archive = self.root / "release.tar.gz"
        self.destination = self.root / "release"

    def tearDown(self):
        self.workspace.cleanup()

    def test_extracts_files_under_the_destination(self):
        build_archive(self.archive, [
            (TOP, "dir", None),
            (f"{TOP}/applications/website/server.mjs", "file", "export {};\n"),
            (f"{TOP}/scripts/validate.sh", "exec", "#!/bin/sh\n"),
        ])
        agent.extract(self.archive, self.destination, COMMIT)
        server = self.destination / "applications" / "website" / "server.mjs"
        self.assertEqual(server.read_text(), "export {};\n")
        self.assertEqual(server.stat().st_mode & 0o777, 0o644)
        self.assertEqual((self.destination / "scripts" / "validate.sh").stat().st_mode & 0o777, 0o755)

    def test_rejects_unsafe_entries(self):
        cases = {
            "traversal": [(f"{TOP}/../escape.txt", "file", "x")],
            "absolute": [("/etc/escape.txt", "file", "x")],
            "symlink": [(f"{TOP}/link", "link", "/etc/passwd")],
            "foreign top folder": [(f"other-{COMMIT}/file.txt", "file", "x")],
        }
        for label, entries in cases.items():
            with self.subTest(label):
                build_archive(self.archive, entries)
                destination = self.root / label.replace(" ", "-")
                with self.assertRaises(agent.DeployError):
                    agent.extract(self.archive, destination, COMMIT)
                self.assertFalse((self.root / "escape.txt").exists())

    def test_rejects_an_archive_for_another_commit(self):
        build_archive(self.archive, [(f"{TOP}/file.txt", "file", "x")], comment="f" * 40)
        with self.assertRaises(agent.DeployError):
            agent.extract(self.archive, self.destination, COMMIT)


class CiResultTest(unittest.TestCase):
    def test_summarizes_the_latest_run(self):
        self.assertEqual(agent.ci_result([]), "pending")
        self.assertEqual(agent.ci_result([{"run_number": 1, "status": "in_progress"}]), "pending")
        self.assertEqual(agent.ci_result([{"run_number": 1, "status": "completed", "conclusion": "success"}]), "success")
        self.assertEqual(agent.ci_result([
            {"run_number": 2, "status": "completed", "conclusion": "failure"},
            {"run_number": 1, "status": "completed", "conclusion": "success"},
        ]), "failure")
        self.assertEqual(agent.ci_result([
            {"run_number": 3, "status": "completed", "conclusion": "success"},
            {"run_number": 2, "status": "completed", "conclusion": "failure"},
        ]), "success")


class DeployTest(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory()
        self.state = Path(self.workspace.name)
        self.previous = Path("/opt/raksent/releases/previous")
        self.release = Path(f"/opt/raksent/releases/{COMMIT}")
        self.activations = []

    def tearDown(self):
        self.workspace.cleanup()

    def deploy(self, healthy_targets):
        def switch_to(target, expected):
            self.activations.append((target, expected))
            return target in healthy_targets

        with mock.patch.multiple(agent, STATE=self.state, prepare=lambda commit: self.release,
                                 deployed=lambda: self.previous, switch_to=switch_to, prune=lambda keep: None):
            agent.deploy(COMMIT)

    def test_unhealthy_release_restores_the_previous_one_and_is_blocked(self):
        with self.assertRaisesRegex(agent.DeployError, "rolled back to previous"):
            self.deploy({self.previous})
        self.assertEqual(self.activations, [(self.release, COMMIT), (self.previous, None)])
        self.assertTrue((self.state / "blocked" / COMMIT).is_file())

    def test_healthy_release_records_the_previous_one_and_clears_its_block(self):
        (self.state / "blocked").mkdir()
        (self.state / "blocked" / COMMIT).write_text("earlier failure\n")
        self.deploy({self.release})
        self.assertEqual(self.activations, [(self.release, COMMIT)])
        self.assertFalse((self.state / "blocked" / COMMIT).exists())
        self.assertEqual(agent.read_json(self.state / "previous.json"), {"release": str(self.previous)})


class PruneTest(unittest.TestCase):
    def test_keeps_recent_and_protected_releases(self):
        with tempfile.TemporaryDirectory() as workspace:
            releases = Path(workspace)
            now = time.time()
            for age in range(8):
                release = releases / f"release-{age}"
                release.mkdir()
                os.utime(release, (now - age * 60, now - age * 60))
            (releases / ".staging-x").mkdir()
            original = agent.RELEASES
            agent.RELEASES = releases
            try:
                agent.prune({releases / "release-7"})
            finally:
                agent.RELEASES = original
            remaining = sorted(path.name for path in releases.iterdir())
            self.assertEqual(remaining, [".staging-x", "release-0", "release-1", "release-2",
                                         "release-3", "release-4", "release-7"])


if __name__ == "__main__":
    unittest.main()
