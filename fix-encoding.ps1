Get-ChildItem -Recurse -Include *.html,*.css,*.js | ForEach-Object {
    $path = $_.FullName
    $c = Get-Content $path -Raw

    $c = $c `
    -replace "â€”â€”â€”","———" `
    -replace "â€”","—" `
    -replace "â€“","–" `
    -replace "â€™","’" `
    -replace "â€˜","‘" `
    -replace "â€œ","“" `
    -replace "â€","”" `
    -replace "â€¦","…" `
    -replace "Â·","·" `
    -replace "Â©","©" `
    -replace "Ã³","ó" `
    -replace "Ã©","é" `
    -replace "Ã±","ñ" `
    -replace "Â",""

    [System.IO.File]::WriteAllText(
        $path,
        $c,
        [System.Text.UTF8Encoding]::new($false)
    )
}
