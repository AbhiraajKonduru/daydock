# Contributing to Daydock

Thank you for helping improve Daydock. Everyone is welcome to contribute code, documentation, design ideas, bug reports, and thoughtful feedback.

## Before you start

1. Read the README and try the current version so you understand Daydock's workflow.
2. Search existing issues and pull requests for related work.
3. Read active pull requests before starting a larger change. Someone may already be solving the same problem, and their discussion may reveal useful constraints.
4. For a substantial feature or a change to the product philosophy, open an issue first. This gives us a place to agree on the problem and direction before you invest significant time.

Small fixes and documentation improvements can go directly to a pull request.

## Product principles

Contributions should preserve the idea at the center of Daydock: features should reduce planning overhead, not create more machinery to maintain.

A useful feature can be declined if it makes the core experience less focused or moves the project away from that principle.

## Development setup

Install Node.js LTS, Rust stable, and the platform dependencies required by Tauri 2. Then run:

```powershell
npm install
npm run tauri dev
```

Before submitting a change, run:

```powershell
npm test
npm run build
```

Run `npm run tauri build` when your change affects Rust, Tauri configuration, packaging, file access, or native behavior.

## Pull requests

Keep each pull request focused on one problem. In the description:

- Explain the problem and why it matters.
- Describe the solution and important tradeoffs.
- List the platforms you tested.
- Include screenshots or a short recording for visible interface changes.
- Mention any changes to notebook files, storage, sync, or compatibility.
- Link the relevant issue when one exists.

## Review and decisions

The maintainer will review pull requests for correctness, clarity, maintainability, and alignment with Daydock's vision. Reviews may ask for changes or suggest a smaller approach. Approval is not guaranteed, but respectful discussion is always welcome.

Please also review other contributors' pull requests when you can. Helpful testing and focused feedback make the project better, even when you are not writing the change yourself.

By contributing, you agree that your contribution may be distributed under the GNU General Public License v3.0.
