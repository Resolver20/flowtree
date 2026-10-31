"""Render Flowtree's geometric app mark using only Python's standard library."""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'public'

def inside(x, y, box, radius):
    left, top, right, bottom = box
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return (x-cx)**2 + (y-cy)**2 <= radius**2

def mark(x, y):
    boxes = [(132,224,196,288), (316,132,380,196), (316,316,380,380)]
    lines = [(188,248,264,264),(248,156,264,356),(256,156,324,172),(256,340,324,356)]
    return any(inside(x,y,box,8) for box in lines) or any(
        inside(x,y,box,12) and not inside(x,y,(box[0]+14,box[1]+14,box[2]-14,box[3]-14),3)
        for box in boxes)

def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind+data))

def render(size, path):
    rows = bytearray()
    bg = (83,102,200)
    for y in range(size):
        rows.append(0)
        for x in range(size):
            count = sum(mark((x+(sx+.5)/2)*512/size, (y+(sy+.5)/2)*512/size) for sx in range(2) for sy in range(2))
            rows.extend(round(c+(255-c)*count/4) for c in bg)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(rows,9)) + chunk(b'IEND',b'')
    path.write_bytes(data)

for size, name in [(192,'icon-192.png'),(512,'icon-512.png'),(512,'maskable-512.png'),(180,'apple-touch-icon.png')]:
    render(size, ROOT / 'icons' / name)
