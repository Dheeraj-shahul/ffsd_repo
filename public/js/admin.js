// Debug: Confirm script is loading
console.log('admin.js loaded');

// Property Management
async function deleteProperty(id) {
  if (confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
    try {
      console.log(`Deleting property with ID: ${id}`);
      const response = await fetch(`/admin/property/delete/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || 'Property deleted successfully');
        location.reload();
      } else {
        alert(result.message || 'Failed to delete property');
      }
    } catch (error) {
      console.error('Error deleting property:', error.message);
      alert('An error occurred while deleting the property');
    }
  }
}

async function toggleVerify(id, isVerified) {
    console.log(`Toggling verification for property ID: ${id}, isVerified: ${isVerified}`);
    try {
      const response = await fetch(`/admin/property/verify/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVerified }),
      });
      const result = await response.json();
      if (response.ok) {
        alert(`Property ${isVerified === true || isVerified === 'true' ? 'verified' : 'unverified'} successfully`);
        window.location.reload(); // Refresh to update dashboard
      } else {
        console.error('Toggle verify failed:', result.message);
        alert(`Failed to update verification status: ${result.message}`);
      }
    } catch (error) {
      console.error('Toggle verify error:', error);
      alert('Error updating verification status');
    }
  }

// User Management
async function deleteUser(id, userType) {
  if (confirm(`Are you sure you want to delete this ${userType}? This action cannot be undone.`)) {
    try {
      console.log(`Deleting user with ID: ${id}, userType: ${userType}`);
      const response = await fetch(`/admin/user/delete/${id}/${userType}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || 'User deleted successfully');
        location.reload();
      } else {
        alert(result.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error.message);
      alert('An error occurred while deleting the user');
    }
  }
}

async function suspendUser(id, userType, status) {
  try {
    console.log(`Updating user status: ID: ${id}, userType: ${userType}, status: ${status}`);
    const response = await fetch(`/admin/user/status/${id}/${userType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message || `User ${status === 'Active' ? 'activated' : 'suspended'} successfully`);
      location.reload();
    } else {
      alert(result.message || 'Failed to update user status');
    }
  } catch (error) {
    console.error('Error updating user status:', error.message);
    alert('An error occurred while updating user status');
  }
}

// Other AJAX functions
async function approveBooking(id) {
  try {
    const response = await fetch(`/admin/booking/approve/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      alert('Booking approved successfully');
      location.reload();
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to approve booking');
    }
  } catch (error) {
    console.error('Error approving booking:', error.message);
    alert('An error occurred while approving the booking');
  }
}

async function rejectBooking(id) {
  if (confirm('Are you sure you want to reject this booking?')) {
    try {
      const response = await fetch(`/admin/booking/reject/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      alert('Booking rejected successfully');
      location.reload();
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to reject booking');
    }
  } catch (error) {
    console.error('Error rejecting booking:', error.message);
    alert('An error occurred while rejecting the booking');
  }
}
}

async function refundPayment(id) {
  if (confirm('Are you sure you want to issue a refund for this payment?')) {
    try {
      const response = await fetch(`/admin/payment/refund/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || 'Refund processed successfully');
        location.reload();
      } else {
        alert(result.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error.message);
      alert('An error occurred while processing the refund');
    }
  }
}

async function retryPayment(id) {
  try {
    const response = await fetch(`/admin/payment/retry/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message || 'Payment retry initiated');
      location.reload();
    } else {
      alert(result.error || 'Failed to retry payment');
    }
  } catch (error) {
    console.error('Error retrying payment:', error.message);
    alert('An error occurred while retrying the payment');
  }
}

async function completeTask(id) {
  try {
    const response = await fetch(`/admin/notification/complete/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      alert('Notification marked as completed');
      location.reload();
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to complete notification');
    }
  } catch (error) {
    console.error('Error completing notification:', error.message);
    alert('An error occurred while completing the notification');
  }
}

async function completeMaintenance(id) {
  try {
    const response = await fetch(`/admin/maintenance/complete/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      alert('Maintenance request completed');
      location.reload();
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to complete maintenance request');
    }
  } catch (error) {
    console.error('Error completing maintenance:', error.message);
    alert('An error occurred while completing the maintenance request');
  }
}

// Debug: Confirm functions are defined
console.log('Functions defined:', {
  deleteProperty: typeof deleteProperty,
  toggleVerify: typeof toggleVerify,
  deleteUser: typeof deleteUser,
  suspendUser: typeof suspendUser,
  approveBooking: typeof approveBooking,
  rejectBooking: typeof rejectBooking,
  refundPayment: typeof refundPayment,
  retryPayment: typeof retryPayment,
  completeTask: typeof completeTask,
  completeMaintenance: typeof completeMaintenance
});