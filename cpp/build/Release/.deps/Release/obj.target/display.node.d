cmd_Release/obj.target/display.node := g++ -o Release/obj.target/display.node -shared -pthread -rdynamic -m64  -Wl,-soname=display.node -Wl,--start-group Release/obj.target/display/addon.o -Wl,--end-group -lcppgpio -lpthread
