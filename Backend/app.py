from flask import Flask, render_template

app = Flask(__name__, 
            template_folder='../Frontend/templates',
            static_folder='../Frontend/static')

@app.route('/')
def landing():
    """Landing page"""
    return render_template('pages/landing.html')

@app.route('/privacy')
def privacy():
    """Terms & Conditions"""
    return render_template('pages/page0.html')

@app.route('/backgroundcheck')
def backgroundcheck():
    return render_template('pages/backgroundcheck.html')

@app.route('/DA1')
def DA1():
    return render_template('pages/DataAsset1.html')

@app.route('/personal-data-asset')
def personal_data_asset():
    """Personal data asset intro page"""
    return render_template('pages/personalDataAsset.html')

@app.route('/personal-data-asset-questionnaire')
def personal_data_asset_2():
    """Personal data asset questionnaire"""
    return render_template('pages/personalDataAsset2.html')

@app.route('/health-data-asset')
def health_data_asset_p2():
    """Health data asset page"""
    return render_template('pages/healthDataAssetP2.html')

if __name__ == '__main__':
    app.run(debug=True, port=8000)