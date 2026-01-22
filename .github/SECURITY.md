# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report (suspected) security vulnerabilities to **[security@svelterapp.com](mailto:security@svelterapp.com)** or by creating a private security advisory on GitHub. You will receive a response within 48 hours. If the issue is confirmed, we will release a patch as soon as possible depending on complexity but historically within a few days.

Please include the following information:
- Type of vulnerability
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Security Best Practices

When using SvelterApp:

1. **Always change default credentials** - The default admin password should be changed immediately
2. **Keep dependencies updated** - Regularly run `pnpm update` to get security patches
3. **Use strong AUTH_SECRET** - Generate a secure secret using `npx auth secret`
4. **Enable HTTPS in production** - Never run the app over HTTP in production
5. **Review environment variables** - Ensure sensitive data is not committed to version control
6. **Regular security audits** - Run `pnpm audit` regularly to check for vulnerabilities

## Disclosure Policy

When we receive a security bug report, we will assign it to a primary handler. This person will coordinate the fix and release process, involving the following steps:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all releases still under maintenance
4. Release the fixes

We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.
