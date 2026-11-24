import tempfile
import unittest
from importlib.machinery import SourceFileLoader
from importlib.util import module_from_spec, spec_from_loader
from pathlib import Path

NOTIFIER_PATH = Path(__file__).resolve().parents[1] / "infrastructure" / "ansible" / "files" / "raksent-lead-notify"
loader = SourceFileLoader("raksent_lead_notify", str(NOTIFIER_PATH))
notifier = module_from_spec(spec_from_loader("raksent_lead_notify", loader))
loader.exec_module(notifier)

CONFIG = {"host": "smtp.example.com", "port": 587, "user": "sender", "from": "site@example.com", "to": "owner@example.com"}
REFERENCE = "bf8d2d17-3eb3-4ecc-ab92-680bad1c40f7"


def inquiry(**overrides):
    return {
        "id": REFERENCE, "receivedAt": "2026-11-24T18:00:00.000Z", "name": "Test User",
        "email": "test@example.com", "organization": "Example Organization",
        "service": "cloud-security", "message": "Review our test cloud environment.", **overrides,
    }


class ComposeTest(unittest.TestCase):
    def test_contains_the_inquiry_and_a_reply_address(self):
        message = notifier.compose(inquiry(), CONFIG)
        self.assertEqual(message["Subject"], f"New RAKSENT inquiry {REFERENCE}")
        self.assertEqual(message["To"], "owner@example.com")
        self.assertEqual(message["Reply-To"], "test@example.com")
        body = message.get_content()
        self.assertIn("Organization: Example Organization", body)
        self.assertIn("Review our test cloud environment.", body)

    def test_untrusted_text_stays_out_of_headers(self):
        message = notifier.compose(inquiry(
            name="Mallory\r\nBcc: victim@example.com",
            email="attacker@example.com\r\nBcc: victim@example.com",
        ), CONFIG)
        self.assertIsNone(message["Reply-To"])
        self.assertIsNone(message["Bcc"])
        self.assertIn("Name: Mallory Bcc: victim@example.com", message.get_content())
        self.assertNotIn("Mallory", message["Subject"])


class PendingTest(unittest.TestCase):
    def test_skips_sent_temporary_and_foreign_files(self):
        with tempfile.TemporaryDirectory() as workspace:
            leads, sent = Path(workspace, "leads"), Path(workspace, "sent")
            leads.mkdir()
            sent.mkdir()
            other = "0b8d2d17-3eb3-4ecc-ab92-680bad1c40f7"
            for name in (f"{REFERENCE}.json", f"{other}.json", f".{REFERENCE}.tmp", "notes.json"):
                (leads / name).write_text("{}")
            (sent / other).touch()
            self.assertEqual([path.name for path in notifier.pending(leads, sent)], [f"{REFERENCE}.json"])


if __name__ == "__main__":
    unittest.main()
