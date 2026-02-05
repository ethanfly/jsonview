; Register .json file association for JSON Viewer (install)
!macro NSIS_HOOK_POSTINSTALL
  ReadRegStr $0 HKCU "Software\Classes\.json" ""
  StrCmp $0 "" +2
  StrCmp $0 "JSONView.json" +2
    WriteRegStr HKCU "Software\Classes\.json" "JSONViewBackup" $0
  WriteRegStr HKCU "Software\Classes\.json" "" "JSONView.json"
  WriteRegStr HKCU "Software\Classes\JSONView.json" "" "JSON 数据文件"
  WriteRegStr HKCU "Software\Classes\JSONView.json\DefaultIcon" "" "$INSTDIR\jsonview.exe,0"
  WriteRegStr HKCU "Software\Classes\JSONView.json\shell\open\command" "" '"$INSTDIR\jsonview.exe" "%1"'
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

; Unregister .json file association (uninstall)
!macro NSIS_HOOK_POSTUNINSTALL
  ReadRegStr $0 HKCU "Software\Classes\.json" ""
  StrCmp $0 "JSONView.json" 0 done
  DeleteRegKey HKCU "Software\Classes\JSONView.json"
  ReadRegStr $1 HKCU "Software\Classes\.json" "JSONViewBackup"
  StrCmp $1 "" +2
    WriteRegStr HKCU "Software\Classes\.json" "" $1
  DeleteRegValue HKCU "Software\Classes\.json" "JSONViewBackup"
  DeleteRegValue HKCU "Software\Classes\.json" ""
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
done:
!macroend
