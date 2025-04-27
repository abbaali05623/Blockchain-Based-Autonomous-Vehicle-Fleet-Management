import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract environment
const mockContractEnv = () => {
  const state = {
    lastVehicleId: 0,
    vehicles: new Map(),
    blockHeight: 100,
    txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // Mock principal
  };
  
  return {
    state,
    // Mock contract functions
    getVehicle: (vehicleId) => {
      return state.vehicles.get(vehicleId) || null;
    },
    registerVehicle: (model, manufactureYear) => {
      if (manufactureYear <= 2000) {
        return { err: 1 };
      }
      
      const newId = state.lastVehicleId + 1;
      state.lastVehicleId = newId;
      
      state.vehicles.set(newId, {
        owner: state.txSender,
        model,
        manufactureYear,
        registrationDate: state.blockHeight,
        status: 1
      });
      
      return { ok: newId };
    },
    updateVehicleStatus: (vehicleId, newStatus) => {
      const vehicle = state.vehicles.get(vehicleId);
      
      if (!vehicle) {
        return { err: 2 };
      }
      
      if (vehicle.owner !== state.txSender) {
        return { err: 3 };
      }
      
      if (newStatus < 1 || newStatus > 3) {
        return { err: 4 };
      }
      
      vehicle.status = newStatus;
      state.vehicles.set(vehicleId, vehicle);
      
      return { ok: true };
    },
    transferVehicle: (vehicleId, newOwner) => {
      const vehicle = state.vehicles.get(vehicleId);
      
      if (!vehicle) {
        return { err: 2 };
      }
      
      if (vehicle.owner !== state.txSender) {
        return { err: 3 };
      }
      
      vehicle.owner = newOwner;
      state.vehicles.set(vehicleId, vehicle);
      
      return { ok: true };
    },
    // Helper to change the tx-sender for testing
    setTxSender: (principal) => {
      state.txSender = principal;
    }
  };
};

describe('Vehicle Registration Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should register a new vehicle', () => {
    const result = contract.registerVehicle('Tesla Model 3', 2023);
    expect(result).toHaveProperty('ok');
    expect(result.ok).toBe(1);
    
    const vehicle = contract.getVehicle(1);
    expect(vehicle).not.toBeNull();
    expect(vehicle.model).toBe('Tesla Model 3');
    expect(vehicle.manufactureYear).toBe(2023);
    expect(vehicle.status).toBe(1); // Active
  });
  
  it('should reject vehicles manufactured before 2001', () => {
    const result = contract.registerVehicle('Old Car', 1999);
    expect(result).toHaveProperty('err');
    expect(result.err).toBe(1);
  });
  
  it('should update vehicle status', () => {
    // Register a vehicle first
    const registerResult = contract.registerVehicle('Tesla Model S', 2022);
    const vehicleId = registerResult.ok;
    
    // Update to maintenance status
    const updateResult = contract.updateVehicleStatus(vehicleId, 2);
    expect(updateResult).toHaveProperty('ok');
    expect(updateResult.ok).toBe(true);
    
    // Check the updated status
    const vehicle = contract.getVehicle(vehicleId);
    expect(vehicle.status).toBe(2);
  });
  
  it('should reject status update for non-existent vehicle', () => {
    const result = contract.updateVehicleStatus(999, 2);
    expect(result).toHaveProperty('err');
    expect(result.err).toBe(2);
  });
  
  it('should reject status update from non-owner', () => {
    // Register a vehicle first
    const registerResult = contract.registerVehicle('Tesla Model X', 2022);
    const vehicleId = registerResult.ok;
    
    // Change tx-sender to simulate different user
    contract.setTxSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    
    // Try to update status
    const updateResult = contract.updateVehicleStatus(vehicleId, 2);
    expect(updateResult).toHaveProperty('err');
    expect(updateResult.err).toBe(3);
  });
  
  it('should transfer vehicle ownership', () => {
    // Register a vehicle first
    const registerResult = contract.registerVehicle('Tesla Model Y', 2022);
    const vehicleId = registerResult.ok;
    
    // Transfer to new owner
    const newOwner = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const transferResult = contract.transferVehicle(vehicleId, newOwner);
    expect(transferResult).toHaveProperty('ok');
    expect(transferResult.ok).toBe(true);
    
    // Check the updated owner
    const vehicle = contract.getVehicle(vehicleId);
    expect(vehicle.owner).toBe(newOwner);
  });
});
