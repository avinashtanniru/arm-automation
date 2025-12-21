#!/bin/bash
set -e

# Repository directory
REPO_DIR="/opt/automation"

# Fix git dubious ownership issue
echo "Configuring git safe.directory for $REPO_DIR..."
git config --global --add safe.directory "$REPO_DIR"

# Detect execution mode
# If running locally (rsync'd files), use ansible-playbook
# If running for real deployment, use ansible-pull

if [ "$1" == "--pull" ]; then
    echo "Running ansible-pull..."
    ANSIBLE_CMD="ansible-pull"
    if [ -f ".venv/bin/ansible-pull" ]; then
        ANSIBLE_CMD=".venv/bin/ansible-pull"
    fi
    # Update URL to your actual repo
    $ANSIBLE_CMD -o -U https://github.com/avinashtanniru/arm-automation.git -d "$REPO_DIR" -i inventory playbooks/arm.yml --vault-password-file .vault_pass
else
    echo "Running ansible-playbook (Local Mode)..."
    ANSIBLE_CMD="ansible-playbook"
    if [ -f ".venv/bin/ansible-playbook" ]; then
        ANSIBLE_CMD=".venv/bin/ansible-playbook"
    fi
    $ANSIBLE_CMD -i inventory playbooks/arm.yml --connection=local --vault-password-file .vault_pass
fi
