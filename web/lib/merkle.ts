/**
 * Merkle tree utilities for submission batches. Uses @noble/hashes for SHA-256.
 * Builds trees, generates inclusion proofs, and verifies them.
 */
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export function hashLeaf(data: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(data)));
}

export function hashPair(a: string, b: string): string {
  const sorted = a < b ? a + b : b + a;
  return bytesToHex(sha256(hexToBytes(sorted)));
}

export interface MerkleProof {
  leaf: string;
  siblings: Array<{ hash: string; position: 'left' | 'right' }>;
  root: string;
}

export function buildMerkleTree(leaves: string[]): { root: string; layers: string[][] } {
  if (leaves.length === 0) {
    return { root: '', layers: [] };
  }

  let currentLayer = [...leaves];
  const layers: string[][] = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      } else {
        nextLayer.push(currentLayer[i]); // odd leaf promoted
      }
    }
    currentLayer = nextLayer;
    layers.push(currentLayer);
  }

  return { root: currentLayer[0], layers };
}

export function generateProof(leaves: string[], index: number): MerkleProof {
  const { root, layers } = buildMerkleTree(leaves);
  const siblings: MerkleProof['siblings'] = [];

  let idx = index;
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;

    if (siblingIdx < layer.length) {
      siblings.push({
        hash: layer[siblingIdx],
        position: isRight ? 'left' : 'right',
      });
    }

    idx = Math.floor(idx / 2);
  }

  return { leaf: leaves[index], siblings, root };
}

export function verifyProof(proof: MerkleProof): boolean {
  let current = proof.leaf;

  for (const sibling of proof.siblings) {
    if (sibling.position === 'left') {
      current = hashPair(sibling.hash, current);
    } else {
      current = hashPair(current, sibling.hash);
    }
  }

  return current === proof.root;
}
