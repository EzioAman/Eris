---
trigger: always_on
---

DO NOT READ FOLDERS/FILES UNLESS NEEDED, ALways have a reference of each file and functionality so you never lookup every folder. Every folder contains their modules to be imported in strict pydantic verification, only import the functions and use them in the files to reduce making functions again and again, if new function is needed, then add it in module and then call it in the required file, no function definition inside the working files, strictly use uv for python, don't want to manage .toml file!