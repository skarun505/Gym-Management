$env:GIT_TERMINAL_PROMPT = "0"
$env:GIT_EDITOR = "true"
$env:GCM_INTERACTIVE = "never"

Set-Location "c:\Users\SAVY PC\Videos\Personal Project\GYM Management"

git config core.editor "true"
git commit -m "feat: members subscription filter, quick-change badge, delete confirm modal"
git push origin main
