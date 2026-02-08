# Security Setup Instructions

## SSH Known Hosts Configuration

To enable secure SSH host key verification in the CI/CD pipeline, you need to add the EC2 server's host key to GitHub Secrets.

### Step 1: Get EC2 Host Key

SSH into your EC2 instance once manually from your local machine:

```bash
ssh -i ~/.ssh/your-ec2-key.pem ubuntu@your-ec2-host
```

Type "yes" when prompted about the host key. This adds the host to your `~/.ssh/known_hosts` file.

### Step 2: Extract the Host Key

```bash
# Get the host key for your EC2 instance
ssh-keyscan your-ec2-host-or-ip > ec2_known_hosts

# View the content
cat ec2_known_hosts
```

### Step 3: Add to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following secret:
   - **Name**: `EC2_KNOWN_HOSTS`
   - **Value**: The content from `ec2_known_hosts` file

### Example Known Hosts Entry

```
ec2-xx-xx-xx-xx.compute.amazonaws.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...
```

## Required GitHub Secrets

Your repository needs these 4 secrets for secure deployment:

1. **EC2_SSH_KEY** - Your EC2 private key (PEM file content)
2. **EC2_HOST** - Your EC2 public DNS or IP address
3. **EC2_USER** - SSH username (usually `ubuntu` or `ec2-user`)
4. **EC2_KNOWN_HOSTS** - The host key from ssh-keyscan (see above)

## Why This Matters

- ✅ **Prevents Man-in-the-Middle attacks** - Verifies you're connecting to the real server
- ✅ **Production security** - No `StrictHostKeyChecking=no` vulnerability
- ✅ **Audit trail** - Know exactly which host is being deployed to

## Alternative: Using SSH Fingerprint

You can also get the fingerprint from AWS Console:

1. Go to EC2 → Instances → Select your instance
2. Click **Connect**
3. The SSH key fingerprint is shown in the connection dialog

Then verify it matches when you first connect manually.
