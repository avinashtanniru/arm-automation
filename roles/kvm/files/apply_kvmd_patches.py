#!/usr/bin/env python3
import os
import sys

changed = False

# --- 1. Patch htserver.py (Binary 0x00 ping/pong keepalive) ---
htserver_path = "/usr/lib/python3/dist-packages/kvmd/htserver.py"
if os.path.exists(htserver_path):
    with open(htserver_path, "r", encoding="utf-8") as f:
        htserver = f.read()

    if "msg.data[0] == 0" not in htserver:
        old_a = "elif msg.type == WSMsgType.BINARY and len(msg.data) >= 1:\n                handler = self.__ws_bin_handlers.get(msg.data[0])"
        new_a = "elif msg.type == WSMsgType.BINARY and len(msg.data) >= 1:\n                if msg.data[0] == 0:\n                    await ws.wsr.send_bytes(bytes([255]))\n                else:\n                    handler = self.__ws_bin_handlers.get(msg.data[0])"

        old_b = "elif (handler := self.__ws_bin_handlers.get(msg.data[0])):"
        new_b = "if msg.data[0] == 0:\n                    await ws.wsr.send_bytes(bytes([255]))\n                elif (handler := self.__ws_bin_handlers.get(msg.data[0])):"

        if old_a in htserver:
            htserver = htserver.replace(old_a, new_a, 1)
            changed = True
        elif old_b in htserver:
            htserver = htserver.replace(old_b, new_b, 1)
            changed = True

        if changed:
            with open(htserver_path, "w", encoding="utf-8") as f:
                f.write(htserver)
            print("PATCHED: htserver.py")

# --- 2. Patch session.js (State Event Dispatcher & Video Activation) ---
session_js_path = "/usr/share/kvmd/web/share/js/kvm/session.js"
if os.path.exists(session_js_path):
    with open(session_js_path, "r", encoding="utf-8") as f:
        session_js = f.read()

    target = "var __wsJsonHandler = function (ev_type, ev) {"
    replacement = (
        "var __wsJsonHandler = function (ev_type, ev) {\n"
        "\t\tif (ev_type === \"streamer_state\") { __streamer.setState(ev); return; }\n"
        "\t\tif (ev_type === \"hid_state\") { __hid.setState(ev); return; }\n"
        "\t\tif (ev_type === \"gpio_state\") { __gpio.setState(ev); return; }\n"
        "\t\tif (ev_type === \"atx_state\") { __atx.setState(ev); return; }\n"
        "\t\tif (ev_type === \"msd_state\") {\n"
        "\t\t\tif (ev.online === false) { __switch.setMsdConnected(false); }\n"
        "\t\t\telse if (ev.drive !== undefined) { __switch.setMsdConnected(ev.drive.connected); }\n"
        "\t\t\t__msd.setState(ev); return;\n"
        "\t\t}\n"
        "\t\tif (ev_type.startsWith(\"info_\") && ev_type.endsWith(\"_state\")) {\n"
        "\t\t\tlet sub = ev_type.slice(5, -6);\n"
        "\t\t\t__info.setState({ [sub]: ev }); return;\n"
        "\t\t}\n"
        "\t\tif (ev_type === \"streamer_ocr_state\") { __ocr.setState(ev); return; }\n"
        "\t\tif (ev_type === \"hid_keymaps_state\") { __paste.setState(ev); return; }\n"
        "\t\tif (ev_type === \"pong\") { __missed_heartbeats = 0; return; }"
    )

    if target in session_js and "streamer_state" not in session_js:
        session_js = session_js.replace(target, replacement, 1)
        with open(session_js_path, "w", encoding="utf-8") as f:
            f.write(session_js)
        print("PATCHED: session.js")
        changed = True

sys.exit(10 if changed else 0)
