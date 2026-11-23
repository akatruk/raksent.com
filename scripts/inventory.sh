#!/usr/bin/env bash
# Read-only inventory for an authorized Ubuntu host. Review results privately.
set -u
export LC_ALL=C SYSTEMD_PAGER=cat SYSTEMD_COLORS=0
umask 077

section() {
  printf '\n## %s\n' "$1"
  shift
  if command -v "$1" >/dev/null 2>&1; then
    "$@" </dev/null || printf '[check exited with status %s]\n' "$?"
  else
    printf '[command unavailable: %s]\n' "$1"
  fi
}

printf '# RAKSENT host inventory\n'
section 'Collected at UTC' date -u +'%FT%TZ'
section 'Ubuntu release' cat /etc/os-release
section 'Kernel and architecture' uname -srmo
section 'Uptime' uptime
section 'Logical CPUs' getconf _NPROCESSORS_ONLN
section 'Memory' free -m
section 'Filesystem usage' df -hT -x tmpfs -x devtmpfs
section 'Block devices' lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
section 'Network interfaces' ip -brief address
section 'IPv4 routes' ip -4 route show
section 'IPv6 routes' ip -6 route show
section 'DNS resolver' resolvectl status
section 'Listening sockets and owning processes' ss -lntup
section 'Active system services' systemctl list-units --type=service --state=running --no-pager --plain
section 'Failed system units' systemctl --failed --no-pager --plain
section 'Process names without arguments' ps -eo pid,ppid,user,comm --sort=pid
section 'Installed packages' dpkg-query -W '-f=${Package}\t${Version}\n'
section 'Local users, IDs and shells' awk -F: '{ print $1, $3, $7 }' /etc/passwd
section 'Administrative groups' getent group sudo adm docker
section 'System timers' systemctl list-timers --all --no-pager
section 'Cron schedule filenames' find /etc/cron.d /etc/cron.daily /etc/cron.hourly /var/spool/cron/crontabs -maxdepth 1 -type f -printf '%p\n'
section 'Certificate filenames' find /etc/letsencrypt/live -maxdepth 2 -name fullchain.pem -print
section 'Reboot flag' bash -c 'if [ -e /var/run/reboot-required ]; then printf "reboot requested\n"; else printf "no reboot flag\n"; fi'
section 'Available upgrades using existing APT cache' apt list --upgradable
section 'Docker version' docker --version
section 'Docker workloads' docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
section 'Backup-related services and timers' bash -c 'systemctl list-unit-files --no-pager --plain | awk "tolower(\$1) ~ /backup|restic|borg|pgbackrest|wal-g/ {print \$1, \$2}"'
section 'Recent security and service warnings, metadata only' journalctl --since '24 hours ago' -p warning -n 50 -o json --output-fields=_SYSTEMD_UNIT,PRIORITY --no-pager
if command -v sudo >/dev/null 2>&1; then
  section 'Effective default SSH settings' sudo -n /usr/sbin/sshd -T
  section 'UFW rules' sudo -n ufw status verbose
  section 'nftables rules' sudo -n nft list ruleset
  section 'Noninteractive sudo grants' sudo -n -l
fi
section 'Lynis version, if installed' lynis show version
