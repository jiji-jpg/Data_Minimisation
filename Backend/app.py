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
    return render_template('pages/privacy.html')

@app.route('/backgroundcheck')
def backgroundcheck():
    return render_template('pages/backgroundcheck.html')

@app.route('/DA1')
def DA1():
    """Personal Data Header"""
    return render_template('pages/1_PersonalAssetHeader.html')

@app.route('/DA1_1') #questionnaire page has not been set yet.
def DA1_1():
    """Personal Data Questionnaire"""
    return render_template('pages/1A_PersonalAsset.html')

@app.route('/DA2')
def DA2():
    """Health Data Header"""
    return render_template('pages/2_HealthAssetHeader.html')

@app.route('/DA2_2')
def DA2_2():
    """Health Data Questionnaire"""
    return render_template('pages/2A_HealthAsset.html')

@app.route('/DA3')
def DA3():
    """Medicare and Government data asset Header"""
    return render_template('pages/3_GovAssetHeader.html')

if __name__ == '__main__':
    app.run(debug=True, port=8000)