# HyRank Vote Plugin — Release Checklist

## GitHub Release (automated via CI)

The GitHub Actions workflow at `.github/workflows/release.yml` runs automatically
when a version tag is pushed. To trigger a release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow will:
1. Build `hyrank-vote-plugin-0.1.0.jar` via `./gradlew clean build`
2. Run all JUnit tests
3. Create a GitHub Release with the JAR attached

## CurseForge Publish (manual — performed by user)

CurseForge Hytale is still in early access; the exact publish flow may differ.
Follow these steps:

1. **Log in** to [curseforge.com](https://curseforge.com) with your developer account.
2. **Navigate** to: CurseForge → Hytale → Upload a file (or manage your existing project).
3. **Project details** (first publish only):
   - Name: `HyRank Vote Plugin`
   - Short description: "Official HyRank.gg vote plugin — receive in-game rewards when players vote"
   - Categories: Plugins → Server Admin / Voting
   - Links: GitHub repo + HyRank dashboard
4. **Upload JAR**: `plugin/build/libs/hyrank-vote-plugin-0.1.0.jar`
5. **Version metadata**:
   - Display name: `0.1.0`
   - Changelog: paste the GitHub Release notes
   - Release type: Release (or Beta if pre-release)
   - Supported game version: target Hytale version(s)
6. **Submit** for review.

CurseForge may take 1-3 business days to approve the initial project listing.
Subsequent uploads to an approved project are usually instant.

## Version Bump Checklist (before tagging)

- [ ] Update `version` in `gradle.properties`
- [ ] Update `version` in `plugin.json`
- [ ] Update version string in `HyRankPlugin.java` log line
- [ ] Update CHANGELOG / README if needed
- [ ] Run `./gradlew clean build test` locally and confirm PASS
- [ ] `git tag vX.Y.Z && git push origin vX.Y.Z`
