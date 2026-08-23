// Forma canónica única (spine AD-13) que deben devolver TODOS los hooks de
// datos — useDevices y useAllPositions. Un solo tipo compartido para que
// ninguno invente su propia variante.
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: import("../lib/traccarClient").TraccarError }
  | { status: "success"; data: T };
