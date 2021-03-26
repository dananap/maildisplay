{
  "targets": [
    {
      "target_name": "display",
      "sources": [ "addon.cpp" ],
      "libraries": [
            "-lcppgpio", "-lpthread"
      ],
      'cflags': [
        '-O3',
      ],
    }
  ]
}