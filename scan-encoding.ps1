Get-ChildItem -Recurse -Include *.html,*.css,*.js |
Select-String "â€”|â€“|â€™|â€œ|â€|Â|Ã"
