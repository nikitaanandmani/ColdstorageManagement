from flask import Flask, render_template, jsonify, request
import json
import random
import math
from datetime import datetime, timedelta
import uuid

app = Flask(__name__)

# Global variables to store data
sensor_data = []
alerts = []
thresholds = {
    'Zone A - Frozen Foods': {'temp_min': -20, 'temp_max': -18, 'humidity_min': 80, 'humidity_max': 90},
    'Zone B - Dairy': {'temp_min': 2, 'temp_max': 4, 'humidity_min': 85, 'humidity_max': 95},
    'Zone C - Produce': {'temp_min': 0, 'temp_max': 2, 'humidity_min': 90, 'humidity_max': 95},
    'Zone D - Meat': {'temp_min': -2, 'temp_max': 0, 'humidity_min': 80, 'humidity_max': 85},
    'Zone E - Beverages': {'temp_min': 1, 'temp_max': 3, 'humidity_min': 70, 'humidity_max': 80}
}

monitoring_active = False

class SensorSimulator:
    def __init__(self):
        self.zones = {
            'Zone A - Frozen Foods': {'temp_base': -19, 'temp_variation': 1.5, 'humidity_base': 85, 'humidity_variation': 5},
            'Zone B - Dairy': {'temp_base': 3, 'temp_variation': 0.8, 'humidity_base': 90, 'humidity_variation': 3},
            'Zone C - Produce': {'temp_base': 1, 'temp_variation': 1.0, 'humidity_base': 92, 'humidity_variation': 2},
            'Zone D - Meat': {'temp_base': -1, 'temp_variation': 1.2, 'humidity_base': 82, 'humidity_variation': 4},
            'Zone E - Beverages': {'temp_base': 2, 'temp_variation': 0.6, 'humidity_base': 75, 'humidity_variation': 3}
        }
        self.start_time = datetime.now()
    
    def generate_readings(self):
        readings = {}
        current_time = datetime.now()
        
        for zone_name, zone_config in self.zones.items():
            # Generate realistic temperature and humidity
            temp_reading = zone_config['temp_base'] + random.gauss(0, zone_config['temp_variation'])
            humidity_reading = zone_config['humidity_base'] + random.gauss(0, zone_config['humidity_variation'])
            
            # Ensure humidity stays within realistic bounds
            humidity_reading = max(40, min(100, humidity_reading))
            
            readings[zone_name] = {
                'temperature': round(temp_reading, 1),
                'humidity': round(humidity_reading, 1),
                'timestamp': current_time.isoformat()
            }
        
        return readings

simulator = SensorSimulator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/sensor-data')
def get_sensor_data():
    global sensor_data, monitoring_active
    
    if monitoring_active:
        # Generate new reading
        new_reading = simulator.generate_readings()
        
        # Add to sensor data with timestamp
        for zone, data in new_reading.items():
            sensor_data.append({
                'zone': zone,
                'temperature': data['temperature'],
                'humidity': data['humidity'],
                'timestamp': data['timestamp']
            })
        
        # Keep only last 1000 readings
        if len(sensor_data) > 1000:
            sensor_data = sensor_data[-1000:]
        
        # Check for alerts
        check_alerts(new_reading)
    
    # Return latest readings
    latest_readings = {}
    for zone in thresholds.keys():
        zone_data = [d for d in sensor_data if d['zone'] == zone]
        if zone_data:
            latest_readings[zone] = zone_data[-1]
    
    return jsonify(latest_readings)

@app.route('/api/historical-data')
def get_historical_data():
    # Return last 100 readings
    return jsonify(sensor_data[-100:])

@app.route('/api/alerts')
def get_alerts():
    return jsonify(alerts)

@app.route('/api/toggle-monitoring', methods=['POST'])
def toggle_monitoring():
    global monitoring_active
    monitoring_active = not monitoring_active
    return jsonify({'status': monitoring_active})

@app.route('/api/clear-alerts', methods=['POST'])
def clear_alerts():
    global alerts
    alerts = []
    return jsonify({'status': 'cleared'})

@app.route('/api/update-thresholds', methods=['POST'])
def update_thresholds():
    global thresholds
    data = request.json
    zone = data.get('zone')
    if zone in thresholds:
        thresholds[zone].update(data.get('thresholds', {}))
    return jsonify({'status': 'updated'})

@app.route('/api/thresholds')
def get_thresholds():
    return jsonify(thresholds)

def check_alerts(readings):
    global alerts
    current_time = datetime.now()
    
    for zone, data in readings.items():
        zone_thresholds = thresholds[zone]
        
        # Check temperature
        if data['temperature'] < zone_thresholds['temp_min'] or data['temperature'] > zone_thresholds['temp_max']:
            alert = {
                'id': str(uuid.uuid4()),
                'zone': zone,
                'parameter': 'temperature',
                'value': data['temperature'],
                'min_threshold': zone_thresholds['temp_min'],
                'max_threshold': zone_thresholds['temp_max'],
                'timestamp': current_time.isoformat(),
                'severity': 'critical' if abs(data['temperature'] - ((zone_thresholds['temp_min'] + zone_thresholds['temp_max']) / 2)) > 3 else 'warning'
            }
            alerts.append(alert)
        
        # Check humidity
        if data['humidity'] < zone_thresholds['humidity_min'] or data['humidity'] > zone_thresholds['humidity_max']:
            alert = {
                'id': str(uuid.uuid4()),
                'zone': zone,
                'parameter': 'humidity',
                'value': data['humidity'],
                'min_threshold': zone_thresholds['humidity_min'],
                'max_threshold': zone_thresholds['humidity_max'],
                'timestamp': current_time.isoformat(),
                'severity': 'critical' if abs(data['humidity'] - ((zone_thresholds['humidity_min'] + zone_thresholds['humidity_max']) / 2)) > 10 else 'warning'
            }
            alerts.append(alert)
    
    # Keep only last 100 alerts
    if len(alerts) > 100:
        alerts = alerts[-100:]

@app.route('/api/analytics')
def get_analytics():
    if not sensor_data:
        return jsonify({
            'overall_compliance': 0,
            'temp_compliance': 0,
            'humidity_compliance': 0,
            'zone_metrics': {}
        })
    
    # Calculate compliance rates
    total_readings = len(sensor_data)
    temp_compliant = 0
    humidity_compliant = 0
    overall_compliant = 0
    
    zone_metrics = {}
    
    for reading in sensor_data:
        zone = reading['zone']
        if zone in thresholds:
            zone_thresholds = thresholds[zone]
            
            temp_ok = zone_thresholds['temp_min'] <= reading['temperature'] <= zone_thresholds['temp_max']
            humidity_ok = zone_thresholds['humidity_min'] <= reading['humidity'] <= zone_thresholds['humidity_max']
            
            if temp_ok:
                temp_compliant += 1
            if humidity_ok:
                humidity_compliant += 1
            if temp_ok and humidity_ok:
                overall_compliant += 1
            
            # Zone metrics
            if zone not in zone_metrics:
                zone_metrics[zone] = {
                    'temp_compliant': 0,
                    'humidity_compliant': 0,
                    'total': 0,
                    'avg_temp': 0,
                    'avg_humidity': 0
                }
            
            zone_metrics[zone]['total'] += 1
            zone_metrics[zone]['avg_temp'] += reading['temperature']
            zone_metrics[zone]['avg_humidity'] += reading['humidity']
            
            if temp_ok:
                zone_metrics[zone]['temp_compliant'] += 1
            if humidity_ok:
                zone_metrics[zone]['humidity_compliant'] += 1
    
    # Calculate averages and percentages for zones
    for zone, metrics in zone_metrics.items():
        if metrics['total'] > 0:
            metrics['avg_temp'] = metrics['avg_temp'] / metrics['total']
            metrics['avg_humidity'] = metrics['avg_humidity'] / metrics['total']
            metrics['temp_compliance'] = (metrics['temp_compliant'] / metrics['total']) * 100
            metrics['humidity_compliance'] = (metrics['humidity_compliant'] / metrics['total']) * 100
            metrics['overall_compliance'] = min(metrics['temp_compliance'], metrics['humidity_compliance'])
    
    return jsonify({
        'overall_compliance': (overall_compliant / total_readings) * 100 if total_readings > 0 else 0,
        'temp_compliance': (temp_compliant / total_readings) * 100 if total_readings > 0 else 0,
        'humidity_compliance': (humidity_compliant / total_readings) * 100 if total_readings > 0 else 0,
        'zone_metrics': zone_metrics,
        'total_alerts': len(alerts)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)