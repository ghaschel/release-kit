const path = require("path");

module.exports = {
  skip: { tag: false },
  infile: "CHANGELOG.md",
  header: "# Changelog\n\n",
  scripts: {
    postchangelog: "node scripts/split-changelog.mjs",
  },
};
