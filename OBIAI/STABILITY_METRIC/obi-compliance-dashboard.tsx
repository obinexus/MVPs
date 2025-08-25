import React, { useState, useEffect } from 'react';
import { AlertCircle, Activity, TrendingUp, Users, DollarSign, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const ComplianceDashboard = () => {
  const [stabilityMetric, setStabilityMetric] = useState(0.23);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [complianceMetrics, setComplianceMetrics] = useState({
    dailyCompliance: 98.5,
    vatCollected: 12543.67,
    humanInterventions: 3,
    stabilityBreaches: 1
  });

  // Simulate real-time stability updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStabilityMetric(prev => {
        const change = (Math.random() - 0.5) * 0.2;
        return Math.max(0, Math.min(12, prev + change));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Mock active transactions
  useEffect(() => {
    setActiveTransactions([
      {
        id: 'TXN-001',
        type: 'AUTONOMOUS_TRANSPORT',
        status: 'IN_PROGRESS',
        stability: 0.45,
        humanLoop: 'HOTL',
        vatStatus: 'PENDING',
        passenger: 'John Smith',
        route: 'London → Birmingham'
      },
      {
        id: 'TXN-002',
        type: 'HOTEL_CHECKIN',
        status: 'COMPLETED',
        stability: 0.12,
        humanLoop: 'HONTL',
        vatStatus: 'PROCESSED',
        guest: 'Emma Wilson',
        service: 'AI Check-in'
      },
      {
        id: 'TXN-003',
        type: 'AI_CONCIERGE',
        status: 'WARNING',
        stability: 2.8,
        humanLoop: 'HONTL',
        vatStatus: 'ON_HOLD',
        guest: 'Robert Chen',
        service: 'Restaurant Booking'
      }
    ]);
  }, []);

  const getStabilityColor = (stability) => {
    if (stability <= 0.1) return 'text-green-500';
    if (stability <= 1) return 'text-yellow-500';
    if (stability <= 3) return 'text-orange-500';
    if (stability <= 6) return 'text-red-500';
    return 'text-purple-500';
  };

  const getStabilityZone = (stability) => {
    if (stability <= 0.1) return 'STABLE';
    if (stability <= 1) return 'WARNING_LOW';
    if (stability <= 2) return 'WARNING_MED';
    if (stability <= 3) return 'WARNING_HIGH';
    if (stability <= 4.5) return 'DANGER_LOW';
    if (stability <= 6) return 'DANGER_MED';
    if (stability <= 7.5) return 'DANGER_HIGH';
    if (stability <= 9) return 'CRITICAL_LOW';
    if (stability <= 10.5) return 'CRITICAL_HIGH';
    return 'PANIC';
  };

  const getComplianceAction = (stability) => {
    if (stability <= 1) return 'Continue Normal Operations';
    if (stability <= 3) return 'Enhanced Monitoring Active';
    if (stability <= 6) return 'Prepare Human Handoff';
    return 'EMERGENCY PROTOCOLS ACTIVE';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">OBI Legal Compliance Dashboard</h1>
        <p className="text-gray-400">Real-time monitoring for HOTL/HONTL systems</p>
      </div>

      {/* Main Stability Indicator */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">System Stability</h2>
            <div className="flex items-center space-x-4">
              <Activity className={`w-8 h-8 ${getStabilityColor(stabilityMetric)}`} />
              <span className={`text-4xl font-bold ${getStabilityColor(stabilityMetric)}`}>
                {stabilityMetric.toFixed(2)}
              </span>
              <span className="text-lg text-gray-400">
                Zone: {getStabilityZone(stabilityMetric)}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Action: {getComplianceAction(stabilityMetric)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">95.4% Target Compliance</p>
            <div className="flex items-center justify-end mt-2">
              {complianceMetrics.dailyCompliance >= 95.4 ? (
                <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
              )}
              <span className="text-2xl font-bold">
                {complianceMetrics.dailyCompliance}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">VAT Collected Today</p>
              <p className="text-2xl font-bold">£{complianceMetrics.vatCollected}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Human Interventions</p>
              <p className="text-2xl font-bold">{complianceMetrics.humanInterventions}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Stability Breaches</p>
              <p className="text-2xl font-bold">{complianceMetrics.stabilityBreaches}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Services</p>
              <p className="text-2xl font-bold">{activeTransactions.length}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Active Transactions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Active Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2">Transaction ID</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Stability</th>
                <th className="pb-2">Loop Type</th>
                <th className="pb-2">VAT Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTransactions.map(transaction => (
                <tr key={transaction.id} className="border-b border-gray-700">
                  <td className="py-3">{transaction.id}</td>
                  <td className="py-3">
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {transaction.type}
                    </span>
                  </td>
                  <td className="py-3">
                    {transaction.passenger || transaction.guest}
                    <br />
                    <span className="text-xs text-gray-400">
                      {transaction.route || transaction.service}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`font-bold ${getStabilityColor(transaction.stability)}`}>
                      {transaction.stability.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      transaction.humanLoop === 'HOTL' ? 'bg-purple-600' : 'bg-blue-600'
                    }`}>
                      {transaction.humanLoop}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      transaction.vatStatus === 'PROCESSED' ? 'bg-green-600' :
                      transaction.vatStatus === 'ON_HOLD' ? 'bg-orange-600' :
                      'bg-gray-600'
                    }`}>
                      {transaction.vatStatus}
                    </span>
                  </td>
                  <td className="py-3">
                    {transaction.stability > 2 && (
                      <button className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm">
                        Request Human
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Alert */}
      {stabilityMetric > 6 && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2" />
            <div>
              <p className="font-bold">CRITICAL STABILITY ALERT</p>
              <p className="text-sm">Human intervention required. VAT processing suspended.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceDashboard;