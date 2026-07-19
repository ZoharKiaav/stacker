mkdir -p stacker-install-docs

cat > stacker-install-docs/STACKER-NATIVE-PLATFORM.md <<'EOF'
# Stacker Native Platform Deployment Notes

## Purpose

This document records the corrected Stacker deployment model after converting the VPS from a temporary manually wired setup into a Stacker/Dokploy-style platform runtime.

The goal is simple:


Stacker must be the primary deployment platform.
vPay and other applications should eventually be deployable by Stacker.