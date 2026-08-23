import { describe, expect, it } from "vitest";
import { bearingToRotateCss, buildVehicleMarkerHtml, vehicleMarkerIconClassName } from "./vehicleMarkerIcon";

describe("vehicleMarkerIconClassName", () => {
  it("agrega la clase --online solo cuando el dispositivo está en línea", () => {
    expect(vehicleMarkerIconClassName(true)).toBe("vehicle-marker-icon vehicle-marker-icon--online");
    expect(vehicleMarkerIconClassName(false)).toBe("vehicle-marker-icon");
  });
});

describe("bearingToRotateCss", () => {
  it("convierte un rumbo normal a rotate(Xdeg)", () => {
    expect(bearingToRotateCss(45)).toBe("rotate(45deg)");
  });

  it("normaliza rumbos negativos o mayores a 360 (datos crudos de Traccar no siempre vienen limpios)", () => {
    expect(bearingToRotateCss(-10)).toBe("rotate(350deg)");
    expect(bearingToRotateCss(725)).toBe("rotate(5deg)");
  });

  it("0 grados es válido (norte) y no colapsa a NaN", () => {
    expect(bearingToRotateCss(0)).toBe("rotate(0deg)");
  });
});

describe("buildVehicleMarkerHtml", () => {
  it("separa el aro/estado del rotor de rotación en nodos distintos (spine AD-6)", () => {
    const html = buildVehicleMarkerHtml();
    expect(html).toContain('class="vehicle-marker__ring"');
    expect(html).toContain('class="vehicle-marker__rotor"');
    // el color NUNCA va inline aquí -- lo decide el CSS vía la clase del
    // contenedor (vehicle-marker-icon--online), no un valor embebido.
    expect(html).not.toMatch(/stroke="#|fill="#/);
  });
});
