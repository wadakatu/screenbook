# Release Process

## Automated Release Flow

This project uses [Changesets](https://github.com/changesets/changesets) with GitHub Actions for automated releases.

### Workflow

1. **Add changeset in feature branch**
   ```bash
   pnpm changeset
   ```
   - Select packages to release
   - Choose version bump type (patch/minor/major)
   - Write changelog summary

2. **Merge feature PR to main**
   - Changeset file (`.changeset/*.md`) is merged with the feature

3. **Automatic "Version Packages" PR**
   - GitHub Action (`changesets/action@v1`) detects changesets on main
   - Automatically creates a PR titled "Version Packages"
   - PR contains version bumps and CHANGELOG updates

4. **Merge "Version Packages" PR**
   - Review the generated changelog
   - Merge the PR

5. **Automatic publish**
   - GitHub Action publishes to npm (using OIDC)
   - Creates GitHub Release with changelog

### Key Files

| File | Purpose |
|------|---------|
| `.changeset/config.json` | Changeset configuration |
| `.github/workflows/release.yml` | Release automation workflow |
| `packages/*/CHANGELOG.md` | Auto-generated changelogs |

### Version Bump Guidelines

| Change Type | Bump | Example |
|-------------|------|---------|
| Breaking changes | major | Remove API, change behavior |
| New features | minor | Add command, new option |
| Bug fixes | patch | Fix bug, update docs |

### Important Notes

- **Do NOT manually run** `pnpm changeset version` on main branch
- Let the GitHub Action handle version bumps and changelog generation
- Changesets should be added in feature branches, not directly to main
- Multiple changesets can accumulate before release
