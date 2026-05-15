(() => {
  // Inject CSS styles with unique class names
  const style = document.createElement("style");
  style.id = "vd-dialerStyle";
  style.textContent = `
    .vd-reset * {
      box-sizing: border-box;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Floating Toggle Button - Responsive */
    #vd-dialerToggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(45deg, #4CAF50, #45a049);
      color: white;
      border: none;
      border-radius: 50px;
      width: 60px;
      height: 60px;
      font-size: 20px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Mobile - smaller button on very small screens */
    @media (max-width: 480px) {
      #vd-dialerToggle {
        width: 55px;
        height: 55px;
        font-size: 18px;
        bottom: 15px;
        right: 15px;
      }
    }

    /* Tablet and Desktop - larger button */
    @media (min-width: 768px) {
      #vd-dialerToggle {
        width: 50px;
        height: 50px;
        font-size: 24px;
        bottom: 30px;
        right: 30px;
      }
    }

    #vd-dialerToggle:hover {
      transform: scale(1.1);
      box-shadow: 0 10px 30px rgba(76, 175, 80, 0.6);
    }

    /* Dialer Panel - Mobile First Responsive */
    #vd-dialerPanel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100vw;
      max-height: 90vh;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(20px);
      border-radius: 20px 20px 0 0;
      display: none;
      flex-direction: column;
      z-index: 10000;
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      animation: vd-slideUpMobile 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes vd-slideUpMobile {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* Tablet Layout */
    @media (min-width: 768px) {
      #vd-dialerPanel {
        bottom: 90px;
        right: 20px;
        left: auto;
        width: 450px;
        max-height: 80vh;
        border-radius: 20px;
        animation: vd-slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
    }

    /* Desktop Layout */
    @media (min-width: 1024px) {
      #vd-dialerPanel {
        bottom: 95px;
        right: 30px;
        width: 400px;
      }
    }

    @keyframes vd-slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .vd-dialer-header {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 15px 20px;
      position: relative;
      text-align: center;
    }

    /* Mobile header adjustments */
    @media (max-width: 480px) {
      .vd-dialer-header {
        padding: 12px 15px;
      }
    }

    /* Tablet and up header */
    @media (min-width: 768px) {
      .vd-dialer-header {
        padding: 20px;
      }
    }

    .vd-dialer-header h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 5px 0;
    }

    @media (min-width: 768px) {
      .vd-dialer-header h2 {
        font-size: 20px;
      }
    }

    .vd-dialer-header .vd-subtitle {
      font-size: 11px;
      opacity: 0.8;
      margin: 0;
    }

    @media (min-width: 768px) {
      .vd-dialer-header .vd-subtitle {
        font-size: 12px;
      }
    }

    .vd-close-btn {
      position: absolute;
      right: 15px;
      top: 15px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      color: white;
      font-size: 16px;
    }

    @media (min-width: 768px) {
      .vd-close-btn {
        right: 20px;
        top: 20px;
        width: 30px;
        height: 30px;
        font-size: 18px;
      }
    }

    .vd-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

    .vd-dialer-body {
      padding: 20px 15px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    @media (min-width: 768px) {
      .vd-dialer-body {
        padding: 25px;
        gap: 15px;
      }
    }

    .vd-input-group {
      position: relative;
    }

    .vd-input-group .vd-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #333;
      margin-bottom: 6px;
    }

    @media (min-width: 768px) {
      .vd-input-group .vd-label {
        font-size: 14px;
        margin-bottom: 8px;
      }
    }

    .vd-input-group .vd-input {
      width: 100%;
      padding: 12px 15px;
      font-size: 15px;
      border: 2px solid #e1e1e1;
      border-radius: 10px;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }

    @media (min-width: 768px) {
      .vd-input-group .vd-input {
        padding: 7px 12px;
        font-size: 16px;
        border-radius: 12px;
      }
    }

    .vd-input-group .vd-input:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .vd-input-group .vd-input.vd-error {
      border-color: #e74c3c;
      background: #ffeaea;
    }

    .vd-button-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }

    /* Mobile - single column for better touch targets */
    @media (max-width: 480px) {
      .vd-button-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }

    @media (min-width: 768px) {
      .vd-button-grid {
        gap: 12px;
        margin-top: 10px;
      }
    }

    .vd-btn {
      padding: 10px 10px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-height: 44px; /* Touch-friendly minimum */
    }

    @media (min-width: 768px) {
      .vd-btn {
        padding: 10px 10px;
        font-size: 14px;
        border-radius: 12px;
        min-height: auto;
      }
    }

    .vd-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .vd-btn-primary-d {
      background: linear-gradient(45deg, #4CAF50, #45a049);
      color: white;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }

    .vd-btn-primary-d:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }

    .vd-btn-danger-d {
      background: linear-gradient(45deg, #e74c3c, #c0392b);
      color: white;
      box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
      display: none;
    }

    .vd-btn-danger-d:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
    }

    .vd-btn-warning-d {
      background: linear-gradient(45deg, #f39c12, #e67e22);
      color: white;
    }

    .vd-btn-info-d {
      background: linear-gradient(45deg, #3498db, #2980b9);
      color: white;
    }

    .vd-btn-success-d {
      background: linear-gradient(45deg, #28a745, #218838);
      color: white;
    }

    .vd-btn-secondary-d {
      background: linear-gradient(45deg, #95a5a6, #7f8c8d);
      color: white;
    }

    .vd-status-card {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      margin-top: 8px;
    }

    @media (min-width: 768px) {
      .vd-status-card {
        border-radius: 12px;
        padding: 20px;
        margin-top: 10px;
      }
    }

    .vd-status-text {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 6px;
      line-height: 1.4;
    }

    @media (min-width: 768px) {
      .vd-status-text {
        font-size: 16px;
        margin-bottom: 8px;
      }
    }

    .vd-timer-display {
      font-size: 20px;
      font-weight: 700;
      color: #e74c3c;
      font-family: 'Courier New', monospace;
    }

    @media (min-width: 768px) {
      .vd-timer-display {
        font-size: 24px;
      }
    }

    .vd-dialer-footer {
      background: #f8f9fa;
      padding: 12px 15px;
      text-align: center;
      font-size: 11px;
      color: #666;
      border-top: 1px solid #e1e1e1;
    }

    @media (min-width: 768px) {
      .vd-dialer-footer {
        padding: 15px;
        font-size: 12px;
      }
    }

    .vd-footer-brand {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Incoming Call Notification - Responsive */
    .vd-incoming-call {
      position: fixed;
      top: 20px;
      left: 15px;
      right: 15px;
      width: auto;
      max-width: none;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(20px);
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: none;
      z-index: 15000;
      animation: vd-slideInDown 0.5s ease-out;
    }

    @keyframes vd-slideInDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Tablet and up - position top right */
    @media (min-width: 768px) {
      .vd-incoming-call {
        top: 30px;
        left: auto;
        right: 30px;
        width: 350px;
        max-width: 350px;
        border-radius: 20px;
        padding: 25px;
        animation: vd-slideInRight 0.5s ease-out;
      }

      @keyframes vd-slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    }

    .vd-incoming-call.vd-ringing {
      animation: vd-pulse 1s infinite alternate;
    }

    @keyframes vd-pulse {
      0% { box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3); }
      100% { box-shadow: 0 20px 50px rgba(76, 175, 80, 0.5); }
    }

    @media (min-width: 768px) {
      @keyframes vd-pulse {
        0% { box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
        100% { box-shadow: 0 25px 70px rgba(76, 175, 80, 0.5); }
      }
    }

    .vd-incoming-header {
      text-align: center;
      margin-bottom: 15px;
    }

    @media (min-width: 768px) {
      .vd-incoming-header {
        margin-bottom: 20px;
      }
    }

    .vd-incoming-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 5px;
    }

    @media (min-width: 768px) {
      .vd-incoming-title {
        font-size: 18px;
      }
    }

    .vd-caller-info {
      font-size: 18px;
      font-weight: 700;
      color: #4CAF50;
      margin-bottom: 12px;
      word-break: break-all;
    }

    @media (min-width: 768px) {
      .vd-caller-info {
        font-size: 20px;
        margin-bottom: 15px;
        word-break: normal;
      }
    }

    .vd-call-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    @media (min-width: 768px) {
      .vd-call-actions {
        gap: 15px;
      }
    }

    .vd-call-btn {
      width: 55px;
      height: 55px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      font-size: 22px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (min-width: 768px) {
      .vd-call-btn {
        width: 60px;
        height: 60px;
        font-size: 24px;
      }
    }

    .vd-accept-btn {
      background: linear-gradient(45deg, #4CAF50, #45a049);
      color: white;
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }

    .vd-accept-btn:hover {
      transform: scale(1.1);
    }

    .vd-reject-btn {
      background: linear-gradient(45deg, #e74c3c, #c0392b);
      color: white;
      box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
    }

    .vd-reject-btn:hover {
      transform: scale(1.1);
    }

    /* Modal Overlays - Responsive */
    .vd-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 20000;
      backdrop-filter: blur(5px);
      padding: 15px;
    }

    @media (min-width: 768px) {
      .vd-modal-overlay {
        padding: 20px;
      }
    }

    .vd-modal-box {
      background: white;
      padding: 20px;
      border-radius: 15px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-height: 85vh;
      overflow-y: auto;
    }

    @media (min-width: 768px) {
      .vd-modal-box {
        padding: 30px;
        border-radius: 20px;
        max-width: 600px;
        max-height: 80vh;
      }
    }

    .vd-modal-box h3 {
      color: #2c3e50;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 15px;
      text-align: center;
    }

    @media (min-width: 768px) {
      .vd-modal-box h3 {
        font-size: 24px;
        margin-bottom: 20px;
      }
    }

    .vd-radio-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin-bottom: 20px;
    }

    @media (min-width: 480px) {
      .vd-radio-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
    }

    @media (min-width: 768px) {
      .vd-radio-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        margin-bottom: 25px;
      }
    }

    .vd-radio-option {
      display: flex;
      align-items: center;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
      transition: all 0.3s ease;
      cursor: pointer;
      min-height: 44px; /* Touch-friendly */
    }

    @media (min-width: 768px) {
      .vd-radio-option {
        padding: 12px;
        min-height: auto;
      }
    }

    .vd-radio-option:hover {
      background: #e9ecef;
      transform: translateY(-1px);
    }

    .vd-radio-option input {
      margin-right: 8px;
      cursor: pointer;
      min-width: 16px;
      min-height: 16px;
    }

    @media (min-width: 768px) {
      .vd-radio-option input {
        margin-right: 10px;
      }
    }

    .vd-radio-option .vd-radio-label {
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
      line-height: 1.3;
      flex: 1;
    }

    @media (min-width: 768px) {
      .vd-radio-option .vd-radio-label {
        font-size: 13px;
      }
    }

    .vd-modal-submit {
      width: 100%;
      padding: 12px;
      background: linear-gradient(45deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      min-height: 44px;
    }

    @media (min-width: 768px) {
      .vd-modal-submit {
        padding: 15px;
        border-radius: 12px;
        font-size: 16px;
        min-height: auto;
      }
    }

    .vd-modal-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
    }

    .vd-park-timer {
      margin-top: 8px;
    }

    @media (min-width: 768px) {
      .vd-park-timer {
        margin-top: 10px;
      }
    }

    .vd-park-timer-label {
      font-size: 12px;
      color: #f39c12;
      margin-bottom: 4px;
    }

    @media (min-width: 768px) {
      .vd-park-timer-label {
        font-size: 14px;
        margin-bottom: 5px;
      }
    }

    .vd-park-timer-display {
      font-size: 16px;
      color: #f39c12;
    }

    @media (min-width: 768px) {
      .vd-park-timer-display {
        font-size: 18px;
      }
    }

    /* Landscape mobile adjustments */
    @media (max-width: 768px) and (orientation: landscape) {
      #vd-dialerPanel {
        max-height: 95vh;
        bottom: 0;
      }
      
      .vd-dialer-body {
        padding: 15px;
        gap: 10px;
      }
      
      .vd-button-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
    }

    /* High DPI displays */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .vd-btn, .vd-call-btn, #vd-dialerToggle {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    } 20px;
      padding: 25px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: none;
      z-index: 15000;
      animation: vd-slideInRight 0.5s ease-out;
    }

    @keyframes vd-slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .vd-incoming-call.vd-ringing {
      animation: vd-pulse 1s infinite alternate;
    }

    @keyframes vd-pulse {
      0% { box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
      100% { box-shadow: 0 25px 70px rgba(76, 175, 80, 0.5); }
    }

    .vd-incoming-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .vd-incoming-title {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 5px;
    }

    .vd-caller-info {
      font-size: 20px;
      font-weight: 700;
      color: #4CAF50;
      margin-bottom: 15px;
    }

    .vd-call-actions {
      display: flex;
      gap: 15px;
      justify-content: center;
    }

    .vd-call-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      font-size: 24px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .vd-accept-btn {
      background: linear-gradient(45deg, #4CAF50, #45a049);
      color: white;
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }

    .vd-accept-btn:hover {
      transform: scale(1.1);
    }

    .vd-reject-btn {
      background: linear-gradient(45deg, #e74c3c, #c0392b);
      color: white;
      box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
    }

    .vd-reject-btn:hover {
      transform: scale(1.1);
    }

    /* Modal Overlays */
    .vd-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 20000;
      backdrop-filter: blur(5px);
    }

    .vd-modal-box {
      background: white;
      padding: 30px;
      border-radius: 20px;
      width: 90%;
      max-width: 600px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
      max-height: 80vh;
      overflow-y: auto;
    }

    .vd-modal-box h3 {
      color: #2c3e50;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      text-align: center;
    }

    .vd-radio-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 10px;
      margin-bottom: 25px;
    }

    .vd-radio-option {
      display: flex;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .vd-radio-option:hover {
      background: #e9ecef;
      transform: translateY(-1px);
    }

    .vd-radio-option input {
      margin-right: 10px;
      cursor: pointer;
    }

    .vd-radio-option .vd-radio-label {
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
    }

    .vd-modal-submit {
      width: 100%;
      padding: 15px;
      background: linear-gradient(45deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .vd-modal-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
    }

    .vd-park-timer {
      margin-top: 10px;
    }

    .vd-park-timer-label {
      font-size: 14px;
      color: #f39c12;
      margin-bottom: 5px;
    }

    .vd-park-timer-display {
      font-size: 18px;
      color: #f39c12;
    }

    /* TVS Collections theme overrides */
    #vd-dialerToggle {
      background: linear-gradient(135deg, #0077b6, #00b4d8);
      box-shadow: 0 10px 28px rgba(0, 119, 182, 0.3);
    }

    #vd-dialerToggle:hover {
      box-shadow: 0 14px 34px rgba(0, 119, 182, 0.42);
    }

    #vd-dialerPanel,
    .vd-incoming-call,
    .vd-modal-box {
      border: 1px solid rgba(0, 119, 182, 0.18);
      box-shadow: 0 22px 55px rgba(0, 30, 60, 0.2);
    }

    .vd-dialer-header {
      background: linear-gradient(135deg, #073b5c, #0077b6);
    }

    .vd-input-group .vd-input:focus {
      border-color: #00b4d8;
      box-shadow: 0 0 0 3px rgba(0, 180, 216, 0.16);
    }

    .vd-btn-primary-d,
    .vd-accept-btn,
    .vd-modal-submit {
      background: linear-gradient(135deg, #0077b6, #00b4d8);
      box-shadow: 0 8px 20px rgba(0, 119, 182, 0.24);
    }

    .vd-btn-danger-d,
    .vd-reject-btn {
      background: linear-gradient(135deg, #dc2626, #ef4444);
      box-shadow: 0 8px 20px rgba(220, 38, 38, 0.22);
    }

    .vd-btn-warning-d {
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
    }

    .vd-btn-info-d {
      background: linear-gradient(135deg, #0284c7, #38bdf8);
    }

    .vd-btn-success-d {
      background: linear-gradient(135deg, #059669, #10b981);
    }

    .vd-btn-secondary-d {
      background: linear-gradient(135deg, #334155, #64748b);
    }

    .vd-caller-info,
    .vd-footer-brand {
      color: #0077b6;
    }

    .vd-timer-display {
      color: #dc2626;
    }

    .vd-park-timer-label,
    .vd-park-timer-display {
      color: #f59e0b;
    }
  `;
  document.head.appendChild(style);

  // Audio elements
  const ringTone = new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGI=",
  );
  const endSound = new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGI=",
  );

  // Global variables
  let callTimer = null;
  let callStartTime = null;
  let totalCallTime = 0;
  let isInCall = false;
  let currentCall = null;
  let parkInterval = null;
  let parkStartTime = null;
  let totalParkTime = 0;
  let isParked = false;
  let autoAnswerTimeout = null;
  let isAutoAnswered = false;

  // Create floating toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "vd-dialerToggle";
  toggleBtn.className = "vd-reset";
  toggleBtn.innerHTML = "📞";
  document.body.appendChild(toggleBtn);

  // Create incoming call notification
  const incomingCall = document.createElement("div");
  incomingCall.id = "vd-incomingCall";
  incomingCall.className = "vd-incoming-call vd-reset";
  incomingCall.innerHTML = `
    <div class="vd-incoming-header">
      <div class="vd-incoming-title">📞 Incoming Call</div>
      <div class="vd-caller-info" id="vd-callerNumber">Unknown Number</div>
    </div>
    <div class="vd-call-actions">
      <button class="vd-call-btn vd-accept-btn" id="vd-acceptCall">📞</button>
      <button class="vd-call-btn vd-reject-btn" id="vd-rejectCall">📵</button>
    </div>
  `;
  document.body.appendChild(incomingCall);

  // Create dialer panel
  const panel = document.createElement("div");
  panel.id = "vd-dialerPanel";
  panel.className = "vd-reset";
  panel.innerHTML = `
    <div class="vd-dialer-header">
      <h2>Smart Dialer</h2>
      <div class="vd-subtitle">Professional Call Management</div>
      <div class="vd-close-btn" id="vd-closeDialer">×</div>
    </div>
    
    <div class="vd-dialer-body">
      <div class="vd-input-group">
        <label class="vd-label">Phone Number</label>
        <input type="text" class="vd-input" id="vd-phoneInput" placeholder="Enter 10-digit number" maxlength="10" />
      </div>

      <div class="vd-button-grid">
        <button class="vd-btn vd-btn-warning-d" id="vd-pauseBtn">⏸ Pause</button>
        <button class="vd-btn vd-btn-info-d" id="vd-resumeBtn">▶ Resume</button>
        <button class="vd-btn vd-btn-secondary-d" id="vd-parkCallBtn">🅿 Park Call</button>
        <button class="vd-btn vd-btn-success-d" id="vd-grabCallBtn" style="display: none;">📲 Grab Call</button>
        <button class="vd-btn vd-btn-secondary-d" id="vd-conferenceBtn">👥 Conference</button>
      </div>

      <button class="vd-btn vd-btn-primary-d" id="vd-callBtn" style="grid-column: 1 / -1; margin-top: 10px;">📞 Start Call</button>
      <button class="vd-btn vd-btn-danger-d" id="vd-endCallBtn" style="grid-column: 1 / -1;">📵 End Call</button>

      <div class="vd-status-card">
        <div class="vd-status-text" id="vd-callStatus">Ready to dial</div>
        <div class="vd-timer-display" id="vd-timerDisplay">00:00</div>
        <div class="vd-park-timer" id="vd-parkTimer" style="display: none;">
          <div class="vd-park-timer-label">Park Time:</div>
          <div class="vd-timer-display vd-park-timer-display" id="vd-parkTimerDisplay">00:00</div>
        </div>
      </div>
    </div>

    <div class="vd-dialer-footer">
      Powered by <span class="vd-footer-brand">The-Connections</span> Vicidial-Dialer
    </div>
  `;
  document.body.appendChild(panel);

  // Create disposition modal
  const dispositionModal = document.createElement("div");
  dispositionModal.className = "vd-modal-overlay vd-reset";
  dispositionModal.id = "vd-dispositionModal";
  dispositionModal.innerHTML = `
    <div class="vd-modal-box">
      <h3>📋 Call Disposition</h3>
      <form id="vd-dispoForm">
        <div class="vd-radio-grid">
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="B" id="vd-busy" />
            <label class="vd-radio-label" for="vd-busy">🔴 B - Busy</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="CALLBK" id="vd-callback" />
            <label class="vd-radio-label" for="vd-callback">🔄 CALLBK - Call Back *</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="DNC" id="vd-dnc" />
            <label class="vd-radio-label" for="vd-dnc">🚫 DNC - DO NOT CALL</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="NA" id="vd-na" />
            <label class="vd-radio-label" for="vd-na">📵 NA - No Answer</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="NI" id="vd-ni" />
            <label class="vd-radio-label" for="vd-ni">❌ NI - Not Interested</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="SALE" id="vd-sale" />
            <label class="vd-radio-label" for="vd-sale">✅ SALE - Sale Made</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="CB" id="vd-cb" />
            <label class="vd-radio-label" for="vd-cb">📞 CB - Call Back</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="CD" id="vd-cd" />
            <label class="vd-radio-label" for="vd-cd">📴 CD - Call Disconnected</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="IC" id="vd-ic" />
            <label class="vd-radio-label" for="vd-ic">⚠️ IC - Incomplete Call</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="IR" id="vd-ir" />
            <label class="vd-radio-label" for="vd-ir">ℹ️ IR - Information Received</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="NVC" id="vd-nvc" />
            <label class="vd-radio-label" for="vd-nvc">📳 NVC - No Voice Contact</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="dispo" value="RING" id="vd-ring" />
            <label class="vd-radio-label" for="vd-ring">📞 RING - Ringing</label>
          </div>
        </div>
        <button type="submit" class="vd-modal-submit">Submit Disposition</button>
      </form>
    </div>
  `;
  document.body.appendChild(dispositionModal);

  // Create pause code modal
  const pauseModal = document.createElement("div");
  pauseModal.className = "vd-modal-overlay vd-reset";
  pauseModal.id = "vd-pauseModal";
  pauseModal.innerHTML = `
    <div class="vd-modal-box">
      <h3>⏸ Select Pause Code</h3>
      <form id="vd-pauseForm">
        <div class="vd-radio-grid">
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="ACT" id="vd-activity" />
            <label class="vd-radio-label" for="vd-activity">📋 ACT - ACTIVITY</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="ATL" id="vd-atl" />
            <label class="vd-radio-label" for="vd-atl">👨‍💼 ATL - ASSISTANT TEAM LEADER</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="BB" id="vd-bio" />
            <label class="vd-radio-label" for="vd-bio">🚻 BB - BIO BREAK</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="BRE" id="vd-briefing" />
            <label class="vd-radio-label" for="vd-briefing">📋 BRE - BRIEFING</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="CLIENT" id="vd-client" />
            <label class="vd-radio-label" for="vd-client">👥 CLIENT - CLIENT</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="ES" id="vd-escalation" />
            <label class="vd-radio-label" for="vd-escalation">⚠️ ES - ESCALATION</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="IT" id="vd-technical" />
            <label class="vd-radio-label" for="vd-technical">💻 IT - TECHNICAL</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="LB" id="vd-lunch" />
            <label class="vd-radio-label" for="vd-lunch">🍽 LB - LUNCH BREAK</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="LEADER" id="vd-leader" />
            <label class="vd-radio-label" for="vd-leader">👑 LEADER - LEADER</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="MD" id="vd-manual" />
            <label class="vd-radio-label" for="vd-manual">📞 MD - MANUAL DIALING</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="OJ" id="vd-onJob" />
            <label class="vd-radio-label" for="vd-onJob">💼 OJ - ON JOB</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="QF" id="vd-quality" />
            <label class="vd-radio-label" for="vd-quality">⭐ QF - QUALITY FEEDBACK</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="TB" id="vd-tea" />
            <label class="vd-radio-label" for="vd-tea">☕ TB - TEA BREAK</label>
          </div>
          <div class="vd-radio-option">
            <input type="radio" name="pauseCode" value="TRANI" id="vd-training" />
            <label class="vd-radio-label" for="vd-training">📚 TRANI - TRAINING</label>
          </div>
        </div>
        <button type="submit" class="vd-modal-submit">Apply Pause Code</button>
      </form>
    </div>
  `;
  document.body.appendChild(pauseModal);

  // Get DOM elements with unique IDs
  const elements = {
    toggleBtn: document.getElementById("vd-dialerToggle"),
    panel: document.getElementById("vd-dialerPanel"),
    phoneInput: document.getElementById("vd-phoneInput"),
    callBtn: document.getElementById("vd-callBtn"),
    endCallBtn: document.getElementById("vd-endCallBtn"),
    pauseBtn: document.getElementById("vd-pauseBtn"),
    resumeBtn: document.getElementById("vd-resumeBtn"),
    parkCallBtn: document.getElementById("vd-parkCallBtn"),
    grabCallBtn: document.getElementById("vd-grabCallBtn"),
    conferenceBtn: document.getElementById("vd-conferenceBtn"),
    callStatus: document.getElementById("vd-callStatus"),
    timerDisplay: document.getElementById("vd-timerDisplay"),
    parkTimer: document.getElementById("vd-parkTimer"),
    parkTimerDisplay: document.getElementById("vd-parkTimerDisplay"),
    closeDialer: document.getElementById("vd-closeDialer"),
    incomingCall: document.getElementById("vd-incomingCall"),
    acceptCall: document.getElementById("vd-acceptCall"),
    rejectCall: document.getElementById("vd-rejectCall"),
    callerNumber: document.getElementById("vd-callerNumber"),
    dispositionModal: document.getElementById("vd-dispositionModal"),
    pauseModal: document.getElementById("vd-pauseModal"),
    dispoForm: document.getElementById("vd-dispoForm"),
    pauseForm: document.getElementById("vd-pauseForm"),
  };

  // API call function
  const callVicidialApi = (func, value = "") => {
    const baseURL = "http://10.42.33.203/agc/api.php";
    const params = new URLSearchParams({
      source: "test",
      user: "LHLAdmin",
      pass: "C0nnecti0ns2025",
      agent_user: "Test1",
      function: func,
      value: value,
    });
    const fullUrl = `${baseURL}?${params.toString()}`;
    console.log("Calling API:", fullUrl);
    return fetch(fullUrl)
      .then((res) => res.text())
      .catch((err) => {
        console.error("API Error:", err);
        return "ERROR";
      });
  };

  // Timer functions
  function startTimer() {
    if (callTimer) clearInterval(callTimer);
    callStartTime = Date.now();

    callTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      elements.timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
  }

  function stopTimer() {
    if (callTimer) {
      clearInterval(callTimer);
      callTimer = null;
      totalCallTime = Math.floor((Date.now() - callStartTime) / 1000);
      return totalCallTime;
    }
    return 0;
  }

  function resetTimer() {
    elements.timerDisplay.textContent = "00:00";
    totalCallTime = 0;
  }

  // Park timer functions
  function startParkTimer() {
    if (parkInterval) clearInterval(parkInterval);
    parkStartTime = Date.now();
    elements.parkTimer.style.display = "block";
    elements.parkTimerDisplay.textContent = "00:00";

    parkInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - parkStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      elements.parkTimerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
  }

  function stopParkTimer() {
    if (parkInterval) {
      clearInterval(parkInterval);
      parkInterval = null;
      totalParkTime = Math.floor((Date.now() - parkStartTime) / 1000);
      return totalParkTime;
    }
    return 0;
  }

  function resetParkTimer() {
    elements.parkTimer.style.display = "none";
    elements.parkTimerDisplay.textContent = "00:00";
    totalParkTime = 0;
    parkStartTime = null;
  }

  // Panel toggle
  function togglePanel() {
    const isVisible = elements.panel.style.display === "flex";
    elements.panel.style.display = isVisible ? "none" : "flex";
  }

  // Show/hide modals
  function showModal(modal) {
    modal.style.display = "flex";
  }

  function hideModal(modal) {
    modal.style.display = "none";
  }

  // Show incoming call notification (only when real call comes)
  function showIncomingCall() {
    elements.incomingCall.style.display = "block";
    elements.incomingCall.classList.add("vd-ringing");

    // Play ring tone
    ringTone.loop = true;
    ringTone.play().catch(() => console.log("Could not play ring tone"));

    // Auto-answer after 2.5 seconds
    autoAnswerTimeout = setTimeout(() => {
      autoAnswerIncomingCall();
    }, 2500);
  }

  // Auto-answer incoming call
  function autoAnswerIncomingCall() {
    ringTone.pause();
    ringTone.currentTime = 0;
    elements.incomingCall.style.display = "none";
    elements.incomingCall.classList.remove("vd-ringing");

    // Clear timeout if it exists
    if (autoAnswerTimeout) {
      clearTimeout(autoAnswerTimeout);
      autoAnswerTimeout = null;
    }

    // Start call timer
    startTimer();
    isInCall = true;
    isAutoAnswered = true;
    currentCall = elements.callerNumber.textContent;

    // Update UI for auto-answered call
    elements.callStatus.textContent = `📞 Auto-answered call from ${currentCall}`;
    elements.callBtn.style.display = "none";
    elements.endCallBtn.style.display = "block";

    // Show dialer panel
    elements.panel.style.display = "flex";

    // Disable buttons except park, conference, and end call
    disableButtonsForAutoAnswer();
  }

  // Start call function
  function startCall() {
    const number = elements.phoneInput.value.trim();
    if (!/^[0-9]{10}$/.test(number)) {
      elements.phoneInput.classList.add("vd-error");
      elements.callStatus.textContent =
        "❌ Please enter a valid 10-digit number";
      return;
    }

    elements.phoneInput.classList.remove("vd-error");
    elements.callStatus.textContent = `📞 Dialing ${number}...`;
    elements.callBtn.style.display = "none";
    elements.endCallBtn.style.display = "block";

    // Start the timer
    startTimer();
    isInCall = true;
    isAutoAnswered = false;
    currentCall = number;

    // Enable all buttons for manually started calls
    enableAllButtons();

    // API call

    fetch(
      `http://10.42.33.203/agc/api.php?source=test&user=LHLAdmin&pass=C0nnecti0ns2025&agent_user=Test&function=external_dial&value=8390568003&phone_code=91&search=YES&preview=NO&focus=NO`,
    )
      .then((res) => res.text())
      .then((data) => {
        console.log("Start Call Response:", data);
        elements.callStatus.textContent = `✅ Connected to ${number}`;
      })
      .catch((err) => {
        console.error("Start Call Error:", err);
        elements.callStatus.textContent = "❌ Call failed";
        endCall();
      });
  }

  // Button control functions
  function disableButtonsForAutoAnswer() {
    // Disable all buttons except park, conference, and end call
    elements.pauseBtn.disabled = true;
    elements.resumeBtn.disabled = true;
    elements.callBtn.disabled = true;
    elements.phoneInput.disabled = true;

    // Add visual styling for disabled buttons
    elements.pauseBtn.style.opacity = "0.5";
    elements.resumeBtn.style.opacity = "0.5";
    elements.pauseBtn.style.cursor = "not-allowed";
    elements.resumeBtn.style.cursor = "not-allowed";
    elements.phoneInput.style.opacity = "0.5";
    elements.phoneInput.style.cursor = "not-allowed";

    // Ensure park/grab buttons are always enabled based on state
    elements.parkCallBtn.disabled = false;
    elements.grabCallBtn.disabled = false;
    elements.conferenceBtn.disabled = false;
    elements.endCallBtn.disabled = false;

    // Show appropriate park/grab button
    if (isParked) {
      elements.parkCallBtn.style.display = "none";
      elements.grabCallBtn.style.display = "block";
    } else {
      elements.parkCallBtn.style.display = "block";
      elements.grabCallBtn.style.display = "none";
    }
  }

  function enableAllButtons() {
    // Enable all buttons
    elements.pauseBtn.disabled = false;
    elements.resumeBtn.disabled = false;
    elements.callBtn.disabled = false;
    elements.phoneInput.disabled = false;
    elements.parkCallBtn.disabled = false;
    elements.grabCallBtn.disabled = false;
    elements.conferenceBtn.disabled = false;
    elements.endCallBtn.disabled = false;

    // Reset visual styling
    elements.pauseBtn.style.opacity = "1";
    elements.resumeBtn.style.opacity = "1";
    elements.pauseBtn.style.cursor = "pointer";
    elements.resumeBtn.style.cursor = "pointer";
    elements.phoneInput.style.opacity = "1";
    elements.phoneInput.style.cursor = "text";

    // Show appropriate park/grab button
    if (isParked) {
      elements.parkCallBtn.style.display = "none";
      elements.grabCallBtn.style.display = "block";
    } else {
      elements.parkCallBtn.style.display = "block";
      elements.grabCallBtn.style.display = "none";
    }
  }

  // End call function
  function endCall() {
    const callDuration = stopTimer();
    const parkDuration = isParked ? stopParkTimer() : 0;

    let durationText = `Duration: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")}`;
    if (parkDuration > 0) {
      durationText += ` (Park: ${Math.floor(parkDuration / 60)}:${(parkDuration % 60).toString().padStart(2, "0")})`;
    }

    elements.callStatus.textContent = `📴 Call ended (${durationText})`;
    elements.callBtn.style.display = "block";
    elements.endCallBtn.style.display = "none";
    elements.parkCallBtn.style.display = "block";
    elements.grabCallBtn.style.display = "none";

    isInCall = false;
    isParked = false;
    isAutoAnswered = false;

    // Re-enable all buttons
    enableAllButtons();

    // Play end sound
    endSound.play().catch(() => console.log("Could not play end sound"));

    // API call
    callVicidialApi("external_hangup", "1")
      .then((data) => {
        console.log("Hangup Response:", data);
        showModal(elements.dispositionModal);
      })
      .catch((err) => console.error("Hangup Error:", err));
  }

  // Pause call function
  function pauseCall() {
    callVicidialApi("external_pause", "PAUSE")
      .then((data) => {
        console.log("Pause Call Response:", data);
        showModal(elements.pauseModal);
      })
      .catch((err) => console.error("Pause Call Error:", err));
  }

  // Resume call function
  function resumeCall() {
    callVicidialApi("external_pause", "RESUME")
      .then((data) => {
        console.log("Resume Call Response:", data);
        elements.callStatus.textContent = "✅ Ready for calls";
      })
      .catch((err) => console.error("Resume Call Error:", err));
  }

  // Park and Grab call functions
  function parkCall() {
    if (!isInCall) {
      elements.callStatus.textContent = "❌ No active call to park";
      return;
    }

    elements.callStatus.textContent = "🅿 Parking call...";

    // Optimistically start timer & UI so user sees immediate feedback
    startParkTimer();
    isParked = true;
    elements.parkCallBtn.style.display = "none";
    elements.grabCallBtn.style.display = "block";

    // Use the shared API helper (keeps URL/params consistent)
    callVicidialApi("park_call", "PARK_CUSTOMER")
      .then((data) => {
        console.log("Park Call Response:", data);
        elements.callStatus.textContent = "🅿 Call parked - Customer on hold";
      })
      .catch((err) => {
        console.error("Park Call Error:", err);
        // revert UI/timer if API failed
        stopParkTimer();
        isParked = false;
        elements.parkCallBtn.style.display = "block";
        elements.grabCallBtn.style.display = "none";
        elements.callStatus.textContent = "❌ Park call failed";
      });
  }

  function grabCall() {
    if (!isParked) {
      elements.callStatus.textContent = "❌ No parked call to grab";
      return;
    }

    elements.callStatus.textContent = "📲 Grabbing call...";

    callVicidialApi("park_call", "GRAB_CUSTOMER")
      .then((data) => {
        console.log("Grab Call Response:", data);

        // Stop the park timer and show parked duration
        const parkDuration = stopParkTimer();
        isParked = false;

        elements.callStatus.textContent = `📞 Call resumed from park (Parked: ${Math.floor(parkDuration / 60)}:${(parkDuration % 60).toString().padStart(2, "0")})`;
        elements.parkCallBtn.style.display = "block";
        elements.grabCallBtn.style.display = "none";

        // keep the park timer visible but stopped so user can see the parked duration
        elements.parkTimer.style.display = "block";
      })
      .catch((err) => {
        console.error("Grab Call Error:", err);
        elements.callStatus.textContent = "❌ Grab call failed";
      });
  }

  // Conference function
  function conferenceCall() {
    callVicidialApi("conference", "")
      .then((data) => {
        console.log("Conference Response:", data);
        elements.callStatus.textContent = "👥 Conference initiated";
      })
      .catch((err) => console.error("Conference Error:", err));
  }

  // Accept incoming call (manual)
  function acceptIncomingCall() {
    // Clear auto-answer timeout
    if (autoAnswerTimeout) {
      clearTimeout(autoAnswerTimeout);
      autoAnswerTimeout = null;
    }

    ringTone.pause();
    ringTone.currentTime = 0;
    elements.incomingCall.style.display = "none";
    elements.incomingCall.classList.remove("vd-ringing");

    // Start call timer
    startTimer();
    isInCall = true;
    isAutoAnswered = false;
    currentCall = elements.callerNumber.textContent;

    elements.callStatus.textContent = `📞 In call with ${currentCall}`;
    elements.callBtn.style.display = "none";
    elements.endCallBtn.style.display = "block";

    // Show dialer panel
    elements.panel.style.display = "flex";

    // Enable all buttons for manually accepted calls
    enableAllButtons();
  }

  // Reject incoming call
  function rejectIncomingCall() {
    // Clear auto-answer timeout
    if (autoAnswerTimeout) {
      clearTimeout(autoAnswerTimeout);
      autoAnswerTimeout = null;
    }

    ringTone.pause();
    ringTone.currentTime = 0;
    elements.incomingCall.style.display = "none";
    elements.incomingCall.classList.remove("vd-ringing");
    elements.callStatus.textContent = "📵 Call rejected";
  }

  // Handle disposition form
  function handleDisposition(e) {
    e.preventDefault();
    const selected = document.querySelector('input[name="dispo"]:checked');
    if (!selected) {
      alert("Please select a disposition");
      return;
    }

    const value = selected.value;
    callVicidialApi("external_status", value)
      .then((data) => {
        console.log("Disposition Response:", data);
        hideModal(elements.dispositionModal);
        elements.phoneInput.value = "";
        resetTimer();
        resetParkTimer();
        elements.callStatus.textContent = "✅ Ready to dial";
        currentCall = null;
        isParked = false;
        isAutoAnswered = false;

        // Re-enable all buttons
        enableAllButtons();

        // Reset form
        selected.checked = false;
      })
      .catch((err) => console.error("Disposition Error:", err));
  }

  // Handle pause form
  function handlePauseCode(e) {
    e.preventDefault();
    const selected = document.querySelector('input[name="pauseCode"]:checked');
    if (!selected) {
      alert("Please select a pause code");
      return;
    }

    const value = selected.value;
    callVicidialApi("pause_code", value)
      .then((data) => {
        console.log("Pause Code Response:", data);
        hideModal(elements.pauseModal);
        elements.callStatus.textContent = "⏸ Paused for manual dial only";

        // Reset form
        selected.checked = false;
      })
      .catch((err) => console.error("Pause Code Error:", err));
  }

  // Socket.IO for incoming calls
  function initializeSocket() {
    if (typeof io !== "undefined") {
      const socket = io("http://192.168.114.241:3001");

      socket.on("incoming_call", (data) => {
        console.log("Incoming Call:", data);
        elements.callerNumber.textContent = data.caller || "Unknown Number";
        showIncomingCall();
      });

      socket.on("connect", () => {
        console.log("Connected to call server");
        elements.callStatus.textContent = "🟢 Connected to call server";
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from call server");
        elements.callStatus.textContent = "🔴 Disconnected from call server";
      });

      socket.on("connect_error", (error) => {
        console.log("Socket connection error:", error);
        elements.callStatus.textContent = "⚠️ Connection error";
      });
    } else {
      console.log("Socket.IO not available");
      elements.callStatus.textContent = "⚠️ Socket.IO not loaded";
    }
  }

  // Event listeners
  elements.toggleBtn.addEventListener("click", togglePanel);
  elements.closeDialer.addEventListener("click", togglePanel);

  elements.callBtn.addEventListener("click", (e) => {
    if (!e.target.disabled) startCall();
  });

  elements.endCallBtn.addEventListener("click", (e) => {
    if (!e.target.disabled) endCall();
  });

  elements.pauseBtn.addEventListener("click", (e) => {
    if (!e.target.disabled) pauseCall();
  });

  elements.resumeBtn.addEventListener("click", (e) => {
    if (!e.target.disabled) resumeCall();
  });

  elements.parkCallBtn.addEventListener("click", (e) => {
    if (!e.target.disabled) parkCall();
  });

  elements.grabCallBtn.addEventListener("click", (e) => {
    if (!e.target.disabled) grabCall();
  });

  elements.conferenceBtn.addEventListener("click", (e) => {
    if (!e.target.disabled) conferenceCall();
  });
  elements.acceptCall.addEventListener("click", acceptIncomingCall);
  elements.rejectCall.addEventListener("click", rejectIncomingCall);
  elements.dispoForm.addEventListener("submit", handleDisposition);
  elements.pauseForm.addEventListener("submit", handlePauseCode);

  // Phone number input validation
  elements.phoneInput.addEventListener("input", (e) => {
    if (e.target.disabled) return;

    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 10) value = value.slice(0, 10);
    e.target.value = value;

    if (
      elements.phoneInput.classList.contains("vd-error") &&
      value.length === 10
    ) {
      elements.phoneInput.classList.remove("vd-error");
    }
  });

  // Close modals when clicking outside
  [elements.dispositionModal, elements.pauseModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideModal(modal);
      }
    });
  });

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey) {
      switch (e.key) {
        case "d":
          e.preventDefault();
          togglePanel();
          break;
        case "Enter":
          if (
            elements.panel.style.display === "flex" &&
            !isInCall &&
            !elements.callBtn.disabled
          ) {
            e.preventDefault();
            startCall();
          }
          break;
        case "Escape":
          if (isInCall && !elements.endCallBtn.disabled) {
            e.preventDefault();
            endCall();
          }
          break;
      }
    }

    // Space to accept incoming call (only if manual accept is still possible)
    if (
      e.code === "Space" &&
      elements.incomingCall.style.display === "block" &&
      autoAnswerTimeout
    ) {
      e.preventDefault();
      acceptIncomingCall();
    }
  });

  // Initialize the application
  function initialize() {
    console.log("Modern Dialer Interface initialized");

    // Initialize socket connection for real incoming calls
    initializeSocket();

    // Auto-show panel after 3 seconds for demo
    //    setTimeout(() => {
    //      if (elements.panel.style.display !== "flex") {
    //        togglePanel();
    //      }
    //    }, 3000);
  }

  // Initialize when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  // Export functions for external use
  window.dialerAPI = {
    startCall,
    endCall,
    togglePanel,
    showIncomingCall: () => {
      elements.callerNumber.textContent = "Test Number";
      showIncomingCall();
    },
    getCallStatus: () => ({
      isInCall,
      currentCall,
      callDuration: callTimer
        ? Math.floor((Date.now() - callStartTime) / 1000)
        : 0,
    }),
  };

  // Dialer stays closed until the agent opens it.
})();
