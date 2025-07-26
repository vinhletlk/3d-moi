// A basic binary STL parser. This is a simplified implementation.
// It assumes the file is a binary STL, which is the most common format.
export class StlParser {
  private cross(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private subtract(a: number[], b: number[]): number[] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  private dot(a: number[], b: number[]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private magnitude(a: number[]): number {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  }

  private parseAscii(buffer: Buffer): { volume: number; surfaceArea: number } {
    const text = buffer.toString('utf8');
    const lines = text.split('\n');
    
    let totalVolume = 0;
    let totalSurfaceArea = 0;
    let currentVertices: number[][] = [];

    const vertexRegex = /vertex\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const match = vertexRegex.exec(trimmedLine);

      if (match) {
        currentVertices.push([parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]);
      } else if (trimmedLine.startsWith('endfacet') && currentVertices.length === 3) {
        const [v1, v2, v3] = currentVertices;

        // Calculate signed volume of tetrahedron and add to total
        const signedVolume = this.dot(v1, this.cross(v2, v3)) / 6.0;
        totalVolume += signedVolume;
        
        // Calculate surface area of the triangle and add to total
        const edge1 = this.subtract(v2, v1);
        const edge2 = this.subtract(v3, v1);
        const crossProduct = this.cross(edge1, edge2);
        const area = 0.5 * this.magnitude(crossProduct);
        totalSurfaceArea += area;

        currentVertices = [];
      } else if (trimmedLine.startsWith('outer loop')) {
        currentVertices = [];
      }
    }
    
    // The volume is in cubic units of the STL file (usually mm^3). Convert to cm^3.
    const volumeInCm3 = Math.abs(totalVolume) / 1000;
    
    // The surface area is in square units (usually mm^2). Convert to cm^2.
    const surfaceAreaInCm2 = totalSurfaceArea / 100;

    return { volume: volumeInCm3, surfaceArea: surfaceAreaInCm2 };
  }

  private parseBinary(buffer: Buffer): { volume: number; surfaceArea: number } {
    const reader = new DataView(buffer.buffer, buffer.byteOffset, buffer.length);
    const numTriangles = reader.getUint32(80, true);
    let offset = 84;

    let totalVolume = 0;
    let totalSurfaceArea = 0;

    for (let i = 0; i < numTriangles; i++) {
      // Skip normal vector (12 bytes)
      offset += 12;

      const v1 = [
        reader.getFloat32(offset, true),
        reader.getFloat32(offset + 4, true),
        reader.getFloat32(offset + 8, true),
      ];
      offset += 12;

      const v2 = [
        reader.getFloat32(offset, true),
        reader.getFloat32(offset + 4, true),
        reader.getFloat32(offset + 8, true),
      ];
      offset += 12;

      const v3 = [
        reader.getFloat32(offset, true),
        reader.getFloat32(offset + 4, true),
        reader.getFloat32(offset + 8, true),
      ];
      offset += 12;
      
      // Skip attribute byte count (2 bytes)
      offset += 2;

      // Calculate signed volume of tetrahedron and add to total
      const signedVolume = this.dot(v1, this.cross(v2, v3)) / 6.0;
      totalVolume += signedVolume;
      
      // Calculate surface area of the triangle and add to total
      const edge1 = this.subtract(v2, v1);
      const edge2 = this.subtract(v3, v1);
      const crossProduct = this.cross(edge1, edge2);
      const area = 0.5 * this.magnitude(crossProduct);
      totalSurfaceArea += area;
    }
    
    // The volume is in cubic units of the STL file (usually mm^3). Convert to cm^3.
    // 1 cm^3 = 1000 mm^3.
    const volumeInCm3 = Math.abs(totalVolume) / 1000;
    
    // The surface area is in square units (usually mm^2). Convert to cm^2.
    // 1 cm^2 = 100 mm^2.
    const surfaceAreaInCm2 = totalSurfaceArea / 100;

    return { volume: volumeInCm3, surfaceArea: surfaceAreaInCm2 };
  }


  parse(buffer: Buffer): { volume: number; surfaceArea: number } {
    // Check for ASCII STL by looking for 'solid' at the start
    const isAscii = buffer.toString('utf8', 0, 5) === 'solid';
    if (isAscii) {
      return this.parseAscii(buffer);
    }

    return this.parseBinary(buffer);
  }
}
