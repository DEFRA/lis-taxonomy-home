shopt -s nocasematch

BRN_NAME="origin/feature/lreg-123-asdfasdf"


 if [[ $BRN_NAME =~ feature/([a-z]+-[0-9]+)-.* ]]; then
  STORY_ID="${BASH_REMATCH[1]}"
  echo "STORY_ID=${STORY_ID}" >> "$GITHUB_OUTPUT"
  echo "STORY_ID found ${STORY_ID}"
else
  echo "Branch does not have the correct name!" >&2
  exit 1
fi
