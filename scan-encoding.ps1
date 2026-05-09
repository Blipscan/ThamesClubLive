$bad = @(
  [char]0x00C2, # Â
  [char]0x00C3, # Ã
  [char]0x00E2  # â
)

Get-ChildItem -Recurse -Include *.html,*.css,*.js | ForEach-Object {
    $path = $_.FullName
    $text = Get-Content $path -Raw

    foreach ($b in $bad) {
        if ($text.Contains($b)) {
            Write-Host "Possible encoding artifact in: $path"
            break
        }
    }
}
