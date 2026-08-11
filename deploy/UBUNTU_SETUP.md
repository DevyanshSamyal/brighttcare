# Self-hosting on Ubuntu 22.04 (app + database, one server)

This puts everything — Postgres and the Next.js app — on one Ubuntu 22.04
server, talking to each other over `localhost`. No managed database, no
connection pooler, so `DATABASE_URL` and `DIRECT_URL` end up identical.
Assumes you already have SSH access to the server with a user that can
`sudo`.

Run everything below **on the server**, over SSH.

## 1. System packages

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Ubuntu 22.04 installs PostgreSQL 14 from its own repos, which is fine —
Prisma supports it. Create the database and a dedicated app role (don't use
the `postgres` superuser for the app itself):

```bash
sudo -u postgres psql
```
```sql
CREATE USER brighttcare_app WITH PASSWORD 'pick-a-long-random-password';
CREATE DATABASE brighttcare OWNER brighttcare_app;
\q
```

Postgres listens on `localhost` only by default on Ubuntu — that's what you
want, so don't change `listen_addresses` in `postgresql.conf`. The app will
reach it at `localhost:5432`, and nothing outside the server ever needs to.

## 3. Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # expect v24.x
```

Node 24 is the current LTS line as of this writing. Anything 20+ will run
this app fine if you're standardizing on something else already.

## 4. A dedicated system user for the app

Don't run the app as root or as your login user. Giving it a home directory
(`--create-home`) is worth doing even though the app itself lives in
`/opt/brighttcare` — npm wants a real `$HOME` to write its cache to.

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin brighttcare
```

`nologin` means this account can't be used to SSH in directly — that's
intentional. You'll still be able to act as this user via `sudo` (step 5
onward), which doesn't go through the account's login shell.

## 5. Get the app onto the server

Either `git clone` your repo if you've pushed one, or upload the zip you
already have and unzip it. Do the unzip as your own sudo user (not yet as
`brighttcare`, to sidestep any file-permission mismatch from the upload),
then hand ownership over:

```bash
# from your own machine
scp brighttcare.zip your-user@your-server:/tmp/

# back on the server
sudo unzip /tmp/brighttcare.zip -d /opt/
sudo chown -R brighttcare:brighttcare /opt/brighttcare
```

From here on, run commands *as* the `brighttcare` user with
`sudo -H -u brighttcare bash` — the `-H` makes sure `$HOME` is set correctly
for that user, and running `bash` directly (rather than `sudo -u brighttcare -i`)
works even though the account's shell is `nologin`, since we're telling sudo
to run bash directly instead of asking it to look up and launch their login
shell.

```bash
sudo -H -u brighttcare bash
cd /opt/brighttcare
npm install
cp .env.example .env
nano .env
```

Fill in `.env` — for this setup, `DATABASE_URL` and `DIRECT_URL` are the
**same value**:

```
DATABASE_URL="postgresql://brighttcare_app:pick-a-long-random-password@localhost:5432/brighttcare"
DIRECT_URL="postgresql://brighttcare_app:pick-a-long-random-password@localhost:5432/brighttcare"
```

(No `?sslmode=require` needed — this connection never leaves the machine.)
Set `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `NEXTAUTH_URL` (your
domain if you're doing step 8, otherwise `http://YOUR_SERVER_IP:3000` for
now), and a real `SEED_ADMIN_PASSWORD`.

## 6. Migrate, seed, build

Still inside the `sudo -H -u brighttcare bash` session, in `/opt/brighttcare`:

```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run build
exit   # back to your own sudo user
```

## 7. Run it persistently with systemd

A unit file is included at `deploy/brighttcare.service`. Install it:

```bash
sudo cp /opt/brighttcare/deploy/brighttcare.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now brighttcare
sudo systemctl status brighttcare
```

It should show `active (running)`. At this point the app is reachable at
`http://YOUR_SERVER_IP:3000` (open port 3000 temporarily if you want to
check before setting up Nginx — close it again afterward, step 9 covers the
firewall properly).

Logs: `sudo journalctl -u brighttcare -f`

## 8. Nginx reverse proxy + HTTPS (recommended)

This app handles medical records and sets login cookies — running it over
plain HTTP long-term isn't a good idea once anyone other than you is hitting
it. If you have a domain pointed at this server's IP:

```bash
sudo apt install -y nginx
sudo cp /opt/brighttcare/deploy/nginx.conf /etc/nginx/sites-available/brighttcare
sudo ln -s /etc/nginx/sites-available/brighttcare /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/brighttcare   # replace the server_name placeholder
sudo nginx -t && sudo systemctl reload nginx
```

For Certbot, use the snap install — the Certbot project itself recommends
this over the `apt` package, which tends to lag behind:

```bash
sudo apt install -y snapd
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d your-domain.example.com
```

Certbot rewrites the Nginx config to add the HTTPS block and redirect, and
sets up auto-renewal on its own. Update `NEXTAUTH_URL` in `.env` to
`https://your-domain.example.com` and restart the app
(`sudo systemctl restart brighttcare`) so NextAuth issues cookies for the
right URL.

No domain yet? Skip this step for now — the app still works over
`http://YOUR_SERVER_IP:3000` on your local/VPN network. Just don't expose
port 3000 to the open internet without TLS in front of it.

## 9. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # skip if you didn't set up Nginx — see below instead
sudo ufw enable
```

If you're not using Nginx yet and need port 3000 reachable temporarily:
`sudo ufw allow 3000/tcp` — but plan to close it again once Nginx is in
front. Postgres (5432) never needs a rule either way, since it's not
listening on anything but localhost.

## 10. Backups

A simple daily `pg_dump` script is included at `deploy/backup.sh` — it's
already on the server from step 5, it just needs to be executable and on a
schedule:

```bash
sudo chmod +x /opt/brighttcare/deploy/backup.sh
sudo crontab -e
```
Add:
```
0 2 * * * /opt/brighttcare/deploy/backup.sh
```

This keeps 14 days of compressed dumps in `/var/backups/brighttcare`. For
anything beyond "the server itself doesn't lose the only copy," copy those
dumps off the box periodically (rsync to another machine, or upload to
object storage) — this script alone doesn't protect against the server's
disk failing.

## Updating the app later

```bash
sudo -H -u brighttcare bash
cd /opt/brighttcare
git pull   # or re-upload + unzip a new version
npm install
npx prisma migrate deploy   # applies any new migrations, non-interactive
npm run build
exit
sudo systemctl restart brighttcare
```
