# ARM Automation

Ansible-based automation for managing ARM devices (Raspberry Pi, Orange Pi, etc.). This repository handles system configuration, security hardening, software deployment, and maintenance tasks.

## 🚀 Features

- **Automated Bootstrapping**: `bootstrap.sh` script to set up the environment and run playbooks.
- **Role-Based Configuration**:
  - `common`: Essential system configs (Timezone, MOTD, SSH hardening, Cron jobs).
  - `avm`: AVM application deployment (AVM, Nginx, Systemd).
  - `kvm`: KVM (Keyboard/Video/Mouse) services.
  - `tailscale`: VPN setup.
- **Security**:
  - SSH hardened (Port 2222).
  - Ansible Vault for sensitive data (API keys, Serials).
  - Root password updates (via KVM/Common roles).
- **Auto-Updates**:
  - Cron job periodically checks git for updates (`ansible-pull --only-if-changed`).
  - System info generation script (with template support).
- **Custom MOTD**:
  - Banner adapts based on OS (Arch Linux vs Debian).

## 📂 Project Structure

```
├── bootstrap.sh            # Setup & execution script
├── playbooks/
│   └── arm.yml             # Main playbook
├── roles/
│   ├── common/             # Base system tasks
│   ├── avm/                # AVM specific tasks
│   ├── kvm/                # KVM specific tasks
│   └── tailscale/          # Tailscale setup
├── inventory/
│   ├── hosts.yml           # Inventory file
│   └── group_vars/         # Group variables
└── ansible.cfg             # Ansible configuration
```

## 🛠️ Usage

### 1. Prerequisites
- Python 3
- Git
- Ansible (installed via bootstrap)

### 2. Bootstrapping
Clone the repository and run the bootstrap script:

```bash
git clone https://github.com/avinashtanniru/arm-automation.git /opt/automation
cd /opt/automation
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
uv sync
./bootstrap.sh --update
```

### 3. Execution Modes
**Manual Run (Local)**:
```bash
./bootstrap.sh
```

**Auto-Pull (Cron)**:
The `common` role installs a cron job that runs this every 10 minutes:
```bash
./bootstrap.sh --pull
```

## 🔐 Secrets
Sensitive variables (like GitHub Tokens, Device Serials) are encrypted using **Ansible Vault**.
The vault password must be stored in `.vault_pass` file in the root directory.

## ⚙️ Configuration
- **SSH Port**: Default mapped to **2222** (defined in `roles/common/tasks/ssh.yml`).
- **MOTD**: Customized templates in `roles/common/templates/`.
- **Cron Jobs**: Defined in `roles/common/tasks/cron.yml`.

## 🖥️ Supported OS
- Debian / Raspbian
- Arch Linux ARM
