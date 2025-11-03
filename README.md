# release-it-please

A script to automate your release automation

## How to use

```bash
npx release-it-please init
```

## Known issues

When using pnpm, you might encounter the following error:

```bash
ERR_PNPM_NO_GLOBAL_BIN_DIR
```

To fix this, simply run:

```bash
pnpm setup
```

Then source the .zshrc or .bashrc file shown in the output and try again.
