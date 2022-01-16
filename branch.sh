select branch in `git branch --list|sed 's/\*//g'`; do
  break;
done
git switch $branch