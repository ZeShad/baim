"""Re-render the packed editable water source; does not change scene geometry."""
import bpy
from pathlib import Path
folder=Path(__file__).resolve().parent
root=folder.parents[3]
bpy.ops.wm.open_mainfile(filepath=str(folder/'water-c07.blend'))
scene=bpy.context.scene;scene.frame_set(3)
scene.render.filepath=str(root/'assets/chapter1/items/kiro-bottle/fountain-water-c07.png')
bpy.ops.render.render(write_still=True)
