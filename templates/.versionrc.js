module.exports = {
  skip: { tag: false },
  infile: "CHANGELOG.md",
  header: "# Changelog\n\n",
  scripts: {
    postchangelog: "node scripts/split-changelog.mjs",
    posttag: "node scripts/custom-tag-message.mjs",
  },
};
