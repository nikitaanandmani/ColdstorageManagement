// Dashboard JavaScript functionality
class ColdStorageDashboard {
    constructor() {
        this.monitoringActive = false;
        this.updateInterval = null;
        this.sensorData = [];
        this.alerts = [];
        this.analytics = {};
        this.thresholds = {};
        
        this.zones = [
            'Zone A - Frozen Foods',
            'Zone B - Dairy', 
            'Zone C - Produce',
            'Zone D - Meat',
            'Zone E - Beverages'
        ];
        
        this.zoneColors = {
            'Zone A - Frozen Foods': '#0891B2',
            'Zone B - Dairy': '#06B6D4',
            'Zone C - Produce': '#22C55E',
            'Zone D - Meat': '#F59E0B',
            'Zone E - Beverages': '#8B5CF6'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadThresholds();
        this.updateDashboard();
        
        // Start periodic updates
        setInterval(() => {
            if (this.monitoringActive) {
                this.updateDashboard();
            }
        }, 3000);
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Monitoring toggle
        document.getElementById('toggle-monitoring').addEventListener('click', () => {
            this.toggleMonitoring();
        });
        
        // Clear alerts
        document.getElementById('clear-alerts').addEventListener('click', () => {
            this.clearAlerts();
        });
        
        // Time range selector
        document.getElementById('time-range').addEventListener('change', () => {
            this.updateTrendsTab();
        });
        
        // Modal handling
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('threshold-modal').style.display = 'none';
        });
        
        // Threshold form
        document.getElementById('threshold-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateThresholds();
        });
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load tab-specific content
        switch(tabName) {
            case 'live':
                this.updateLiveTab();
                break;
            case 'analytics':
                this.updateAnalyticsTab();
                break;
            case 'alerts':
                this.updateAlertsTab();
                break;
            case 'trends':
                this.updateTrendsTab();
                break;
        }
    }
    
    async toggleMonitoring() {
        try {
            const response = await fetch('/api/toggle-monitoring', {
                method: 'POST'
            });
            const data = await response.json();
            this.monitoringActive = data.status;
            
            const statusText = document.getElementById('status-text');
            const statusDot = document.getElementById('status-dot');
            const toggleBtn = document.getElementById('toggle-monitoring');
            
            if (this.monitoringActive) {
                statusText.textContent = 'Active';
                statusDot.classList.add('active');
                toggleBtn.textContent = 'Stop Monitoring';
                toggleBtn.classList.remove('btn-primary');
                toggleBtn.classList.add('btn-secondary');
            } else {
                statusText.textContent = 'Inactive';
                statusDot.classList.remove('active');
                toggleBtn.textContent = 'Start Monitoring';
                toggleBtn.classList.remove('btn-secondary');
                toggleBtn.classList.add('btn-primary');
            }
        } catch (error) {
            console.error('Error toggling monitoring:', error);
        }
    }
    
    async clearAlerts() {
        try {
            await fetch('/api/clear-alerts', { method: 'POST' });
            this.alerts = [];
            this.updateAlertsTab();
        } catch (error) {
            console.error('Error clearing alerts:', error);
        }
    }
    
    async loadThresholds() {
        try {
            const response = await fetch('/api/thresholds');
            this.thresholds = await response.json();
        } catch (error) {
            console.error('Error loading thresholds:', error);
        }
    }
    
    async updateDashboard() {
        try {
            const [sensorResponse, alertsResponse, analyticsResponse] = await Promise.all([
                fetch('/api/sensor-data'),
                fetch('/api/alerts'),
                fetch('/api/analytics')
            ]);
            
            this.sensorData = await sensorResponse.json();
            this.alerts = await alertsResponse.json();
            this.analytics = await analyticsResponse.json();
            
            // Update current tab
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            switch(activeTab) {
                case 'live':
                    this.updateLiveTab();
                    break;
                case 'analytics':
                    this.updateAnalyticsTab();
                    break;
                case 'alerts':
                    this.updateAlertsTab();
                    break;
            }
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    updateLiveTab() {
        this.updateMetricsGrid();
        this.updateGauges();
        this.updateLiveCharts();
        this.updateSystemOverview();
    }
    
    updateMetricsGrid() {
        const grid = document.getElementById('metrics-grid');
        grid.innerHTML = '';
        
        Object.keys(this.sensorData).forEach(zone => {
            const data = this.sensorData[zone];
            const thresholds = this.thresholds[zone];
            
            if (!data || !thresholds) return;
            
            const tempOk = data.temperature >= thresholds.temp_min && data.temperature <= thresholds.temp_max;
            const humidityOk = data.humidity >= thresholds.humidity_min && data.humidity <= thresholds.humidity_max;
            
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.innerHTML = `
                <h3>${zone}</h3>
                <div class="metric-value">
                    <span class="${tempOk ? 'status-ok' : 'status-critical'}">${data.temperature}°C</span>
                    <span class="${humidityOk ? 'status-ok' : 'status-critical'}">${data.humidity}%</span>
                </div>
                <div class="metric-status">
                    Status: ${tempOk && humidityOk ? 'Normal' : 'Alert'}
                </div>
            `;
            grid.appendChild(card);
        });
    }
    
    updateGauges() {
        const grid = document.getElementById('gauges-grid');
        grid.innerHTML = '';
        
        Object.keys(this.sensorData).forEach(zone => {
            const data = this.sensorData[zone];
            if (!data) return;
            
            const container = document.createElement('div');
            container.className = 'gauge-container';
            container.innerHTML = `<div id="gauge-${zone.replace(/[^a-zA-Z0-9]/g, '')}" style="height: 250px;"></div>`;
            grid.appendChild(container);
            
            this.createGaugeChart(`gauge-${zone.replace(/[^a-zA-Z0-9]/g, '')}`, data.temperature, zone, 'Temperature');
        });
    }
    
    createGaugeChart(elementId, value, title, type) {
        const data = [{
            type: "indicator",
            mode: "gauge+number+delta",
            value: value,
            domain: { x: [0, 1], y: [0, 1] },
            title: { text: `${title}<br>${type}`,font: { size: 18 }  },
            gauge: {
                axis: { range: [null, type === 'Temperature' ? 10 : 100] },
                bar: { color: "#06B6D4" },
                steps: [
                    { range: [0, type === 'Temperature' ? -10 : 50], color: "#0891B2" },
                    { range: [type === 'Temperature' ? -10 : 50, type === 'Temperature' ? 5 : 85], color: "#22C55E" },
                    { range: [type === 'Temperature' ? 5 : 85, type === 'Temperature' ? 10 : 100], color: "#EF4444" }
                ],
                threshold: {
                    line: { color: "#F59E0B", width: 4 },
                    thickness: 0.75,
                    value: value
                }
            }
        }];
        
        const layout = {
            width: 200,
            height: 200,
            margin: { t: 50, b: 25, l: 25, r: 25 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC', size: 12 }
        };
        
        Plotly.newPlot(elementId, data, layout, { displayModeBar: false, responsive: true });
    }
    
    updateLiveCharts() {
        // Temperature chart
        const tempTraces = Object.keys(this.sensorData).map(zone => ({
            x: [new Date()],
            y: [this.sensorData[zone] ? this.sensorData[zone].temperature : 0],
            type: 'scatter',
            mode: 'lines+markers',
            name: zone,
            line: { color: this.zoneColors[zone] }
        }));
        
        const tempLayout = {
            title: 'Real-time Temperature',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Temperature (°C)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('temp-chart', tempTraces, tempLayout, { displayModeBar: false, responsive: true });
        
        // Humidity chart
        const humidityTraces = Object.keys(this.sensorData).map(zone => ({
            x: [new Date()],
            y: [this.sensorData[zone] ? this.sensorData[zone].humidity : 0],
            type: 'scatter',
            mode: 'lines+markers',
            name: zone,
            line: { color: this.zoneColors[zone] }
        }));
        
        const humidityLayout = {
            title: 'Real-time Humidity',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Humidity (%)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('humidity-chart', humidityTraces, humidityLayout, { displayModeBar: false, responsive: true });
    }
    
    updateSystemOverview() {
        // Zone status donut
        const compliantZones = Object.keys(this.sensorData).filter(zone => {
            const data = this.sensorData[zone];
            const thresholds = this.thresholds[zone];
            if (!data || !thresholds) return false;
            
            const tempOk = data.temperature >= thresholds.temp_min && data.temperature <= thresholds.temp_max;
            const humidityOk = data.humidity >= thresholds.humidity_min && data.humidity <= thresholds.humidity_max;
            return tempOk && humidityOk;
        }).length;
        
        const totalZones = Object.keys(this.sensorData).length;
        
        const statusData = [{
            values: [compliantZones, totalZones - compliantZones],
            labels: ['Compliant', 'Non-Compliant'],
            type: 'pie',
            hole: 0.4,
            marker: {
                colors: ['#22C55E', '#EF4444']
            }
        }];
        
        const statusLayout = {
            title: 'Zone Status Overview',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('zone-status-chart', statusData, statusLayout, { displayModeBar: false, responsive: true });
        
        // Current readings scatter plot
        const scatterData = [{
            x: Object.values(this.sensorData).map(d => d ? d.temperature : 0),
            y: Object.values(this.sensorData).map(d => d ? d.humidity : 0),
            mode: 'markers',
            type: 'scatter',
            text: Object.keys(this.sensorData),
            marker: {
                size: 12,
                color: Object.keys(this.sensorData).map(zone => this.zoneColors[zone]),
                line: { width: 2, color: '#F8FAFC' }
            }
        }];
        
        const scatterLayout = {
            title: 'Current Temperature vs Humidity',
            xaxis: { title: 'Temperature (°C)' },
            yaxis: { title: 'Humidity (%)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('current-scatter-chart', scatterData, scatterLayout, { displayModeBar: false, responsive: true });
    }
    
    updateAnalyticsTab() {
        this.updateKPIGrid();
        this.updateZoneDonuts();
        this.updateAdvancedAnalytics();
    }
    
    updateKPIGrid() {
        const grid = document.getElementById('kpi-grid');
        grid.innerHTML = '';
        
        const kpis = [
            { name: 'Overall Compliance', value: this.analytics.overall_compliance || 0, unit: '%' },
            { name: 'Temperature Compliance', value: this.analytics.temp_compliance || 0, unit: '%' },
            { name: 'Humidity Compliance', value: this.analytics.humidity_compliance || 0, unit: '%' },
            { name: 'Active Alerts', value: this.analytics.total_alerts || 0, unit: '' }
        ];
        
        kpis.forEach(kpi => {
            const container = document.createElement('div');
            container.innerHTML = `<div id="kpi-${kpi.name.replace(/\s+/g, '-').toLowerCase()}" style="height: 200px;"></div>`;
            grid.appendChild(container);
            
            this.createKPIChart(`kpi-${kpi.name.replace(/\s+/g, '-').toLowerCase()}`, kpi);
        });
    }
    
    createKPIChart(elementId, kpi) {
        const data = [{
            type: "indicator",
            mode: "gauge+number",
            value: kpi.value,
            title: { text: kpi.name,font: { size: 16 } },
            gauge: {
                axis: { range: [null, kpi.unit === '%' ? 100 : Math.max(100, kpi.value * 1.2)] },
                bar: { color: "#06B6D4" },
                steps: [
                    { range: [0, 50], color: "#EF4444" },
                    { range: [50, 80], color: "#F59E0B" },
                    { range: [80, 100], color: "#22C55E" }
                ]
            }
        }];
        
        const layout = {
            width: 200,
            height: 200,
            margin: { t: 50, b: 25, l: 25, r: 25 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC', size: 10 }
        };
        
        Plotly.newPlot(elementId, data, layout, { displayModeBar: false, responsive: true });
    }
    
    updateZoneDonuts() {
        const container = document.getElementById('zone-donuts');
        container.innerHTML = '';
        
        Object.keys(this.analytics.zone_metrics || {}).forEach(zone => {
            const metrics = this.analytics.zone_metrics[zone];
            const div = document.createElement('div');
            div.innerHTML = `<div id="donut-${zone.replace(/[^a-zA-Z0-9]/g, '')}" style="height: 200px;"></div>`;
            container.appendChild(div);
            
            const data = [{
                values: [metrics.overall_compliance, 100 - metrics.overall_compliance],
                labels: ['Compliant', 'Non-Compliant'],
                type: 'pie',
                hole: 0.4,
                marker: {
                    colors: ['#22C55E', '#EF4444']
                },
                textinfo: 'label+percent',
                textposition: 'inside',
                insidetextorientation: 'horizontal',
                textfont: {
                    size: 14,       
                    color: '#fff'   // white text for visibility
                }
            }];
            
            const layout = {
                title: zone,
                width: 200,
                height: 200,
                margin: { t: 50, b: 25, l: 25, r: 25 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#F8FAFC', size: 10 }
            };
            
            Plotly.newPlot(`donut-${zone.replace(/[^a-zA-Z0-9]/g, '')}`, data, layout, { displayModeBar: false, responsive: true });
        });
    }
    
    updateAdvancedAnalytics() {
        // Radar chart
        const radarData = [{
            type: 'scatterpolar',
            r: Object.values(this.analytics.zone_metrics || {}).map(m => m.overall_compliance || 0),
            theta: Object.keys(this.analytics.zone_metrics || {}),
            fill: 'toself',
            name: 'Zone Performance',
            line: { color: '#06B6D4' },
            fillcolor: 'rgba(6, 182, 212, 0.3)'
        }];
        
        const radarLayout = {
            title: 'Zone Performance Radar',
            polar: {
                radialaxis: {
                    visible: true,
                    range: [0, 100],
                    color: '#F8FAFC'
                },
                angularaxis: {
                    color: '#F8FAFC'
                }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('radar-chart', radarData, radarLayout, { displayModeBar: false, responsive: true });
        
        // Analytics scatter plot
        const analyticsScatterData = [{
            x: Object.values(this.analytics.zone_metrics || {}).map(m => m.temp_compliance || 0),
            y: Object.values(this.analytics.zone_metrics || {}).map(m => m.humidity_compliance || 0),
            mode: 'markers',
            type: 'scatter',
            text: Object.keys(this.analytics.zone_metrics || {}),
            marker: {
                size: 12,
                color: Object.keys(this.analytics.zone_metrics || {}).map(zone => this.zoneColors[zone]),
                line: { width: 2, color: '#F8FAFC' }
            }
        }];
        
        const analyticsScatterLayout = {
            title: 'Temperature vs Humidity Compliance',
            xaxis: { title: 'Temperature Compliance (%)' },
            yaxis: { title: 'Humidity Compliance (%)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('analytics-scatter-chart', analyticsScatterData, analyticsScatterLayout, { displayModeBar: false, responsive: true });
    }
    
    updateAlertsTab() {
        this.updateAlertsSummary();
        this.updateAlertsList();
        this.updateAlertCharts();
    }
    
    updateAlertsSummary() {
        const summary = document.getElementById('alerts-summary');
        
        const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
        const warningAlerts = this.alerts.filter(a => a.severity === 'warning').length;
        const totalAlerts = this.alerts.length;
        
        summary.innerHTML = `
            <div class="alert-summary-card">
                <h3>Critical Alerts</h3>
                <div class="metric-value status-critical">${criticalAlerts}</div>
            </div>
            <div class="alert-summary-card">
                <h3>Warning Alerts</h3>
                <div class="metric-value status-warning">${warningAlerts}</div>
            </div>
            <div class="alert-summary-card">
                <h3>Total Alerts</h3>
                <div class="metric-value">${totalAlerts}</div>
            </div>
        `;
    }
    
    updateAlertsList() {
        const list = document.getElementById('alerts-list');
        
        if (this.alerts.length === 0) {
            list.innerHTML = '<div class="alert-item info">No active alerts</div>';
            return;
        }
        
        list.innerHTML = this.alerts.slice(-10).map(alert => `
            <div class="alert-item ${alert.severity}">
                <strong>${alert.zone}</strong> - ${alert.parameter.toUpperCase()}
                <br>
                Value: ${alert.value}${alert.parameter === 'temperature' ? '°C' : '%'}
                (Range: ${alert.min_threshold} - ${alert.max_threshold})
                <br>
                <small>${new Date(alert.timestamp).toLocaleString()}</small>
            </div>
        `).join('');
    }
    
    updateAlertCharts() {
        // Alert frequency by zone
        const zoneAlertCounts = {};
        this.alerts.forEach(alert => {
            zoneAlertCounts[alert.zone] = (zoneAlertCounts[alert.zone] || 0) + 1;
        });
        
        const frequencyData = [{
            x: Object.keys(zoneAlertCounts),
            y: Object.values(zoneAlertCounts),
            type: 'bar',
            marker: { color: '#06B6D4' }
        }];
        
        const frequencyLayout = {
            title: 'Alert Frequency by Zone',
            xaxis: { title: 'Zone' },
            yaxis: { title: 'Alert Count' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('alert-frequency-chart', frequencyData, frequencyLayout, { displayModeBar: false, responsive: true });
        
        // Alert severity distribution
        const severityCounts = {
            critical: this.alerts.filter(a => a.severity === 'critical').length,
            warning: this.alerts.filter(a => a.severity === 'warning').length
        };
        
        const severityData = [{
            values: Object.values(severityCounts),
            labels: Object.keys(severityCounts),
            type: 'pie',
            marker: {
                colors: ['#EF4444', '#F59E0B']
            }
        }];
        
        const severityLayout = {
            title: 'Alert Severity Distribution',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('alert-severity-chart', severityData, severityLayout, { displayModeBar: false, responsive: true });
    }
    
    async updateTrendsTab() {
        try {
            const response = await fetch('/api/historical-data');
            const historicalData = await response.json();
            
            this.updateHistoricalCharts(historicalData);
            this.updateStatisticsTable(historicalData);
        } catch (error) {
            console.error('Error updating trends:', error);
        }
    }
    
    updateHistoricalCharts(data) {
        // Group data by zone
        const zoneData = {};
        data.forEach(reading => {
            if (!zoneData[reading.zone]) {
                zoneData[reading.zone] = { timestamps: [], temperatures: [], humidity: [] };
            }
            zoneData[reading.zone].timestamps.push(new Date(reading.timestamp));
            zoneData[reading.zone].temperatures.push(reading.temperature);
            zoneData[reading.zone].humidity.push(reading.humidity);
        });
        
        // Temperature trends
        const tempTraces = Object.keys(zoneData).map(zone => ({
            x: zoneData[zone].timestamps,
            y: zoneData[zone].temperatures,
            type: 'scatter',
            mode: 'lines',
            name: zone,
            line: { color: this.zoneColors[zone] }
        }));
        
        const tempLayout = {
            title: 'Historical Temperature Trends',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Temperature (°C)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('historical-temp-chart', tempTraces, tempLayout, { displayModeBar: false, responsive: true });
        
        // Humidity trends
        const humidityTraces = Object.keys(zoneData).map(zone => ({
            x: zoneData[zone].timestamps,
            y: zoneData[zone].humidity,
            type: 'scatter',
            mode: 'lines',
            name: zone,
            line: { color: this.zoneColors[zone] }
        }));
        
        const humidityLayout = {
            title: 'Historical Humidity Trends',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Humidity (%)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#F8FAFC' }
        };
        
        Plotly.newPlot('historical-humidity-chart', humidityTraces, humidityLayout, { displayModeBar: false, responsive: true });
    }
    
    updateStatisticsTable(data) {
        const table = document.getElementById('stats-table');
        
        // Calculate statistics by zone
        const stats = {};
        data.forEach(reading => {
            if (!stats[reading.zone]) {
                stats[reading.zone] = {
                    temperatures: [],
                    humidity: []
                };
            }
            stats[reading.zone].temperatures.push(reading.temperature);
            stats[reading.zone].humidity.push(reading.humidity);
        });
        
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Zone</th>
                        <th>Avg Temp (°C)</th>
                        <th>Min Temp (°C)</th>
                        <th>Max Temp (°C)</th>
                        <th>Avg Humidity (%)</th>
                        <th>Min Humidity (%)</th>
                        <th>Max Humidity (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        Object.keys(stats).forEach(zone => {
            const temps = stats[zone].temperatures;
            const humidity = stats[zone].humidity;
            
            const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
            const minTemp = Math.min(...temps);
            const maxTemp = Math.max(...temps);
            const avgHumidity = humidity.reduce((a, b) => a + b, 0) / humidity.length;
            const minHumidity = Math.min(...humidity);
            const maxHumidity = Math.max(...humidity);
            
            tableHTML += `
                <tr>
                    <td>${zone}</td>
                    <td>${avgTemp.toFixed(1)}</td>
                    <td>${minTemp.toFixed(1)}</td>
                    <td>${maxTemp.toFixed(1)}</td>
                    <td>${avgHumidity.toFixed(1)}</td>
                    <td>${minHumidity.toFixed(1)}</td>
                    <td>${maxHumidity.toFixed(1)}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        table.innerHTML = tableHTML;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ColdStorageDashboard();
});