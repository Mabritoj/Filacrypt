# Deploying Filacrypt yourself

A first-time, step-by-step walkthrough for deploying Filacrypt to your own AWS account — written assuming you've never used AWS SAM, IAM roles, or Route53 before. If you've done this kind of thing before, the condensed version in the [README](../README.md#getting-started) is probably faster.

## What you'll end up with

Cognito (auth), DynamoDB (data), API Gateway + Lambda (the API), and S3 + CloudFront (the website) — all provisioned by one `sam deploy`, fronted by your own domain.

## Before you begin

- [ ] **An AWS account with billing enabled** — sign up at [aws.amazon.com](https://aws.amazon.com) if you don't have one
- [ ] **A domain you control, hosted in Route53** — either registered directly through Route53, or registered elsewhere with its nameservers pointed at a Route53 hosted zone. There's no way to skip this; the app is deployed at a custom domain, not a default AWS-generated URL.
- [ ] **[Node.js](https://nodejs.org/) 20+**
- [ ] **[AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)**
- [ ] **[AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)**
- [ ] **git**
- [ ] **(Windows only)** `npm install -g esbuild` — SAM's esbuild bundler only installs a function's *production* dependencies, so esbuild itself has to already be on your machine globally, or `sam build` fails
- [ ] **(Optional) [Docker](https://www.docker.com/)** — only needed for `sam local invoke`, not for deploying

## Cost & time expectations

This provisions real, billable AWS resources. Most of it sits comfortably in AWS's free tier for a low-traffic personal project (Lambda, DynamoDB, API Gateway, Cognito), but a Route53 hosted zone is about $0.50/month and CloudFront/S3 add small usage-based costs — figure roughly $1–2/month beyond whatever your domain itself costs. First-time setup takes 30–60 minutes, most of it waiting on ACM certificate validation and the CloudFront distribution (both can take 10–20 minutes to finish on their own).

When you're done, [`sam delete`](#tearing-it-down) removes everything the stack created.

## Step 1 — Get your AWS account ready

1. Sign in at [aws.amazon.com](https://aws.amazon.com).
2. Configure the AWS CLI:
   ```bash
   aws configure
   ```
   It'll ask for an Access Key ID / Secret Access Key. If you don't have one: AWS Console → **IAM** → **Users** → your user → **Security credentials** → **Create access key**. Set the region to `us-east-1` — this project's config assumes it.
3. Confirm it worked:
   ```bash
   aws sts get-caller-identity
   ```
   This should print your account ID and user ARN. Write down the account ID — you'll need it in Step 3.

## Step 2 — Point a domain at Route53

- **Don't own a domain yet?** The simplest path is registering one directly through Route53: AWS Console → **Route53** → **Registered domains** → **Register domain**. This auto-creates the hosted zone for you.
- **Already own one elsewhere?** Create a hosted zone for it (Console → **Route53** → **Hosted zones** → **Create hosted zone**), then update your registrar's nameserver (NS) records to the four values Route53 gives you. Propagation can take anywhere from minutes to 48 hours.

Once the hosted zone exists, grab its ID — `samconfig.toml` needs it:
```bash
aws route53 list-hosted-zones-by-name --dns-name yourdomain.com --query "HostedZones[0].Id" --output text
```
Strip the `/hostedzone/` prefix from the output — you want just the ID itself (e.g. `Z1D633PJN98FT9`).

## Step 3 — Create a deploy role

SAM deploys through a CloudFormation execution role, not your IAM user directly:
```bash
aws iam create-role \
  --role-name filacrypt_sam_deployments \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "cloudformation.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name filacrypt_sam_deployments \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

> This grants the role full account access — the simplest way to get every resource type this stack touches (Lambda, API Gateway, DynamoDB, Cognito, CloudFront, ACM, Route53, IAM, S3, SES) working on the first try. Reasonable for a personal project; if you'd rather scope it down afterward, see [AWS's SAM permissions guidance](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-getting-started-permissions.html).

Grab the role's ARN for `samconfig.toml`:
```bash
aws iam get-role --role-name filacrypt_sam_deployments --query "Role.Arn" --output text
```

## Step 4 — Create an S3 bucket for deployment artifacts

SAM uploads your built Lambda code here before deploying. Bucket names are globally unique, so work your account ID into it:
```bash
aws sts get-caller-identity --query Account --output text   # if you need it again
aws s3 mb s3://filacrypt-sam-deployments-<your-account-id> --region us-east-1
```

## Step 5 — Clone the repo and configure

```bash
git clone https://github.com/Mabritoj/Filacrypt.git
cd Filacrypt
cp samconfig.toml.example samconfig.toml
```
Open `samconfig.toml` and fill in the four placeholders (in both the `[dev]` and `[prd]` sections) with what you gathered above:

| Placeholder | Value |
| --- | --- |
| `<YOUR_SAM_DEPLOYMENTS_BUCKET>` | the bucket from Step 4, e.g. `filacrypt-sam-deployments-123456789012` |
| `<YOUR_ACCOUNT_ID>` | your 12-digit AWS account ID |
| `<YOUR_DOMAIN>` | your domain from Step 2, e.g. `filacrypt.com` |
| `<YOUR_ROUTE53_HOSTED_ZONE_ID>` | the hosted zone ID from Step 2 |

`samconfig.toml` is gitignored — it holds real account details and is never committed.

## Step 6 — Build and deploy

```bash
npm install              # root devDependencies, needed for typecheck/test tooling
sam build                # bundles every Lambda handler with esbuild
sam deploy --config-env dev
```
`sam deploy` prints a changeset and asks you to confirm it (`confirm_changeset = true` in `samconfig.toml`) — type `y`. This one command provisions everything: Cognito, DynamoDB, API Gateway, Lambda, S3, CloudFront, the ACM certificate, and the Route53 records tying it all to your domain. Certificate validation and the CloudFront distribution are the slow parts — a first deploy commonly takes 15–25 minutes.

When it finishes, keep the terminal open — the **Outputs** section it prints has the three values you need for Step 8.

## Step 7 — Create your user account

Cognito self-signup is disabled, so you create your own account by hand. Sign-in is passwordless (an emailed 6-digit code), so there's no password to set here:
```bash
aws cognito-idp admin-create-user \
  --user-pool-id <pool-id-from-step-6-outputs> \
  --username you@example.com \
  --message-action SUPPRESS
```

## Step 8 — Run the website

```bash
cd website
npm install
cp .env.example .env.local
```
Fill in `.env.local` with the three values from Step 6's outputs:
```
VITE_API_URL=https://api.yourdomain.com
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```
Then:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000), sign in with the email from Step 7, and enter the code that arrives.

## Troubleshooting

- **`esbuild` not found during `sam build` (Windows)** — run `npm install -g esbuild`; see the prerequisites checklist above.
- **`AWS Region was not found`** — set `AWS_DEFAULT_REGION=us-east-1`, or pass `--region us-east-1` to whichever command failed.
- **`sam local invoke` hangs or errors immediately** — it needs Docker Desktop running; plain `sam build` doesn't.
- **Certificate stuck on "Pending validation"** — ACM validates via a DNS record it auto-creates in your Route53 hosted zone, which only works once Step 2's nameservers have fully propagated. Give it up to 30 minutes, or check the hosted zone for a pending validation CNAME.
- **`AccessDenied` during deploy** — confirm the deploy role from Step 3 has `AdministratorAccess` attached and its trust policy allows `cloudformation.amazonaws.com`.
- **`sam` isn't recognized** — if it's not on your `PATH`, invoke it by its full install path, e.g. (Windows) `C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd`.

## Tearing it down

```bash
sam delete --config-env dev
```
This removes every resource the stack created. It does **not** delete the Route53 hosted zone or S3 deployment bucket from Steps 2 and 4 — remove those by hand if you want a fully clean account.
