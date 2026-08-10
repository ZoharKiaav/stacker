# Create a 16GB swap file
sudo fallocate -l 16G /swapfile

# Secure the swap file
sudo chmod 600 /swapfile

# Format it as swap
sudo mkswap /swapfile

# Enable swap immediately
sudo swapon /swapfile

# Make it permanent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap is active
sudo swapon --show
free -h

## Note
# The swap size (16G in this example) is fully customizable.
# Adjust the value in `fallocate -l` to suit your server’s resources and needs.
# WARNING: Ensure your disk has enough free space before creating large swap files.
# As a general guideline, avoid allocating swap larger than 50–60% of your available disk space.