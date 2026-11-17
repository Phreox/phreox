@echo off
setlocal
cd /d "%~dp0"
set "PHREOX_JAVA=java"
if defined JAVA_HOME set "PHREOX_JAVA=%JAVA_HOME%\bin\java.exe"
if not exist "phreox-space.jar" (
  echo Missing phreox-space.jar.
  exit /b 1
)
if not defined PHREOX_SPACE_CONFIG set "PHREOX_SPACE_CONFIG=%~dp0space.properties"
if not defined PHREOX_JAVA_OPTS set "PHREOX_JAVA_OPTS=-XX:+UseZGC -XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError"
"%PHREOX_JAVA%" %PHREOX_JAVA_OPTS% -jar phreox-space.jar %*
exit /b %ERRORLEVEL%
