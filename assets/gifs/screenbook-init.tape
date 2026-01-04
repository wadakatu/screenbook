# VHS Tape for Screenbook init demo
# Run with: vhs assets/gifs/screenbook-init.tape

Output "assets/gifs/screenbook-init.gif"

Set FontSize 18
Set Width 900
Set Height 600
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 30ms
Set Shell bash

# Prepare demo environment
Hide
Type "cd /tmp && rm -rf screenbook-demo && mkdir -p screenbook-demo/app/dashboard screenbook-demo/app/settings screenbook-demo/app/profile && cd screenbook-demo"
Enter
Sleep 500ms
Type 'echo '"'"'{"name":"demo","type":"module","dependencies":{"next":"^15","react":"^19"}}'"'"' > package.json'
Enter
Sleep 200ms
Type "echo 'export default {}' > next.config.mjs"
Enter
Sleep 200ms
Type "touch app/page.tsx app/dashboard/page.tsx app/settings/page.tsx app/profile/page.tsx"
Enter
Sleep 200ms
# Create alias
Type "alias screenbook='node /Users/wadakatu/www/experiments/screenbook/packages/cli/dist/index.mjs'"
Enter
Sleep 200ms
Type "clear"
Enter
Sleep 200ms
Show

# Show the demo
Type "# Quick start with Screenbook"
Enter
Sleep 1s

Type "screenbook init --no-dev -y"
Enter
Sleep 8s

# Pause to show final output
Sleep 3s
