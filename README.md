# [Pre-Existing Condition](https://afeld.me/pre-existing-condition/)

Random code used in/around the production.

## Exporting media

Note to self: To export media from Apple Photos (rehearsal videos, etc.), run the following [in the OSX built-in Terminal.](https://github.com/RhetTbull/osxphotos/issues/1539#issuecomment-4526370233). Uses [osxphoto](https://github.com/RhetTbull/osxphotos).

```sh
mkdir -p ~/Downloads/rehearsals

pipx run osxphotos export \
   --album "Pre-Existing Condition" \
   --skip-live --skip-original-if-edited --skip-raw \
   --edited-suffix "" \
   --filename "{created.date}_{original_name}" \
   --dry-run --verbose \
   ~/Downloads/rehearsals
```
