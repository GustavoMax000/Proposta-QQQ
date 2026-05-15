Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "iniciar_servidor.bat" & Chr(34), 0
Set WshShell = Nothing
