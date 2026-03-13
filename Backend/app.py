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

@app.route('/sub_landing')
def sub_landing():
    """Sublanding"""
    return render_template('pages/0_Sublanding.html')

@app.route('/DA1')
def DA1():
    """Personal Data Asset Questionnaire (Part 1)"""
    return render_template('pages/1A_PersonalAssetQ.html')

@app.route('/DA2')
def DA2():
    """Personal Data Asset Questionnaire (Part 2)"""
    return render_template('pages/1B_PersonalAssetQ.html')

@app.route('/HA1')
def HA1():
    """Health Data Asset Questionnaire (Part 1)"""
    return render_template('pages/2A_HealthAssetQ.html')

@app.route('/HA2')
def HA2():
    """Health Data Asset Questionnaire (Part 2)"""
    return render_template('pages/2B_HealthAssetQ.html')

@app.route('/GA1')
def GA1():
    """Government Data Asset Questionnaire (Part 1)"""
    return render_template('pages/3A_GovAssetQ.html')

@app.route('/report')
def report():
    """Report"""
    return render_template('pages/report.html')

if __name__ == '__main__':
    app.run(debug=True, port=8000)