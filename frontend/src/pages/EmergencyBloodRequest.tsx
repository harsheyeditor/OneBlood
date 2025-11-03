import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { LocationService } from '../services/LocationService';
import { BloodRequestService } from '../services/BloodRequestService';
import { VoiceNavigation } from '../components/VoiceNavigation';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SuccessAnimation } from '../components/SuccessAnimation';
import { BloodDrop3D } from '../components/BloodDrop3D';
import { HeartPulseAnimation, BloodBagFillingAnimation } from '../components/HeartPulseAnimation';
import { AnimatedInput, AnimatedTextInput, AnimatedTextArea, AnimatedButton } from '../components/AnimatedInput';
import { useTranslation } from 'react-i18next';
import './EmergencyBloodRequest.css';

interface FormData {
  requesterName: string;
  requesterPhone: string;
  bloodType: string;
  urgency: string;
  patientCondition: string;
  location: { lat: number; lng: number } | null;
}

const EmergencyBloodRequest: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { speak, cancel } = useSpeechSynthesis();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<'form' | 'location' | 'confirm' | 'submitting' | 'success'>('form');
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    requesterName: '',
    requesterPhone: '',
    bloodType: 'O+',
    urgency: 'normal',
    patientCondition: '',
    location: null
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');

  // Blood types for selection
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const urgencyLevels = [
    { value: 'critical', label: 'Critical - Life Threatening', color: '#d32f2f' },
    { value: 'urgent', label: 'Urgent - Within 2 Hours', color: '#f57c00' },
    { value: 'normal', label: 'Normal - Within 24 Hours', color: '#388e3c' }
  ];

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError('');

    try {
      const location = await LocationService.getCurrentLocation();
      setFormData(prev => ({ ...prev, location }));
      setLocationError('');

      // Voice confirmation
      speak(t('location_found'));
    } catch (error) {
      setLocationError(t('location_error'));
      speak(t('location_error'));
    } finally {
      setIsLocating(false);
    }
  }, [speak, t]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.requesterName.trim()) {
      newErrors.requesterName = t('name_required');
    }

    if (!formData.requesterPhone.trim()) {
      newErrors.requesterPhone = t('phone_required');
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.requesterPhone)) {
      newErrors.requesterPhone = t('phone_invalid');
    }

    if (!formData.location) {
      newErrors.location = t('location_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle blood request submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      speak(t('form_error'));
      return;
    }

    setStep('submitting');
    setIsAnimating(true);

    try {
      const response = await BloodRequestService.createRequest(formData);

      if (response.success) {
        setRequestId(response.data.requestId);
        setStep('success');

        // Success voice feedback
        speak(t('request_sent_success'));

        // Start blood drop animation
        setTimeout(() => {
          setIsAnimating(false);
        }, 2000);
      } else {
        throw new Error(response.error || 'Request failed');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setStep('form');
      setIsAnimating(false);
      speak(t('request_failed'));

      // Show error message
      setErrors({ submit: t('request_error') });
    }
  };

  // Handle big red button click
  const handleEmergencyButtonClick = () => {
    setStep('location');
    getCurrentLocation();

    // Trigger dramatic blood drop animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1500);

    speak(t('emergency_activated'));
  };

  // Form field handlers
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Language toggle
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
    speak(t('language_changed'));
  };

  // Component variants for animations
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    exit: { opacity: 0, y: -20 }
  };

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 }
  };

  return (
    <div className="emergency-blood-request">
      {/* Voice Navigation Component */}
      <VoiceNavigation />

      {/* Language Toggle */}
      <motion.button
        className="language-toggle"
        onClick={toggleLanguage}
        variants={buttonVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
      >
        {i18n.language === 'en' ? 'हिंदी' : 'English'}
      </motion.button>

      {/* Main Canvas Container */}
      <div className="canvas-container" ref={canvasRef}>
        <AnimatePresence mode="wait">
          {/* Step 1: Emergency Button */}
          {step === 'form' && (
            <motion.div
              key="emergency-button"
              className="emergency-button-container"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <BloodDrop3D
                  isAnimating={isAnimating}
                  onClick={handleEmergencyButtonClick}
                />
              </Canvas>

              <motion.div
                className="emergency-text"
                animate={{
                  scale: isAnimating ? [1, 1.1, 1] : 1,
                  color: isAnimating ? ['#d32f2f', '#ff6b6b', '#d32f2f'] : '#d32f2f'
                }}
                transition={{ duration: 1.5, repeat: isAnimating ? Infinity : 0 }}
              >
                <h1>{t('need_blood')}</h1>
                <p>{t('emergency_description')}</p>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: Location Detection */}
          {step === 'location' && (
            <motion.div
              key="location"
              className="location-container"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <BloodDrop3D isAnimating={isLocating} />
              </Canvas>

              <motion.div className="location-content">
                <h2>{t('detecting_location')}</h2>

                {isLocating ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    {formData.location ? (
                      <div className="location-success">
                        <p>{t('location_detected')}</p>
                        <small>
                          {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                        </small>
                      </div>
                    ) : (
                      <div className="location-error">
                        <p>{locationError}</p>
                        <AnimatedButton
                          variant="warning"
                          onClick={getCurrentLocation}
                          size="medium"
                        >
                          {t('retry')}
                        </AnimatedButton>
                      </div>
                    )}

                    <div className="location-actions">
                      <AnimatedButton
                        variant="secondary"
                        onClick={() => setStep('form')}
                        size="medium"
                      >
                        {t('back')}
                      </AnimatedButton>

                      {formData.location && (
                        <AnimatedButton
                          variant="primary"
                          onClick={() => setStep('confirm')}
                          size="medium"
                        >
                          {t('continue')}
                        </AnimatedButton>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Step 3: Confirm Details */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              className="confirm-container"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="confirm-form">
                <h2>{t('confirm_details')}</h2>

                <div className="form-grid">
                  <AnimatedTextInput
                    label={t('your_name')}
                    value={formData.requesterName}
                    onChange={(value) => handleInputChange('requesterName', value)}
                    placeholder={t('enter_name')}
                    error={errors.requesterName}
                    variant="glass"
                    size="large"
                  />

                  <AnimatedTextInput
                    label={t('phone_number')}
                    value={formData.requesterPhone}
                    onChange={(value) => handleInputChange('requesterPhone', value)}
                    placeholder="+91XXXXXXXXXX"
                    error={errors.requesterPhone}
                    variant="glass"
                    size="large"
                  />

                  <div className="form-group">
                    <label>{t('blood_type')}</label>
                    <div className="blood-type-selector">
                      {bloodTypes.map(type => (
                        <motion.button
                          key={type}
                          className={`blood-type-btn ${formData.bloodType === type ? 'active' : ''}`}
                          onClick={() => handleInputChange('bloodType', type)}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          {type}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t('urgency_level')}</label>
                    <div className="urgency-selector">
                      {urgencyLevels.map(level => (
                        <motion.button
                          key={level.value}
                          className={`urgency-btn ${formData.urgency === level.value ? 'active' : ''}`}
                          style={{
                            borderColor: level.color,
                            backgroundColor: formData.urgency === level.value ? level.color : 'transparent'
                          }}
                          onClick={() => handleInputChange('urgency', level.value)}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          {t(level.value)}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <AnimatedTextArea
                      placeholder={t('describe_condition')}
                      value={formData.patientCondition}
                      onChange={(value) => handleInputChange('patientCondition', value)}
                      rows={3}
                      style={{ minHeight: '120px' }}
                    />
                  </div>
                </div>

                {errors.submit && (
                  <div className="submit-error">
                    {errors.submit}
                  </div>
                )}

                <div className="form-actions">
                  <AnimatedButton
                    variant="secondary"
                    onClick={() => setStep('location')}
                    size="large"
                  >
                    {t('back')}
                  </AnimatedButton>

                  <AnimatedButton
                    variant="danger"
                    onClick={handleSubmit}
                    size="large"
                  >
                    {t('send_request')}
                  </AnimatedButton>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Submitting */}
          {step === 'submitting' && (
            <motion.div
              key="submitting"
              className="submitting-container"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <BloodDrop3D isAnimating={true} />
              </Canvas>

              <div className="submitting-content">
                <LoadingSpinner />
                <h2>{t('sending_request')}</h2>
                <p>{t('contacting_hospitals')}</p>
              </div>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              className="success-container"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="success-animations">
                <SuccessAnimation />
                <div className="heart-animation-wrapper">
                  <HeartPulseAnimation size={80} isAnimating={true} />
                </div>
                <div className="blood-bag-animation-wrapper">
                  <BloodBagFillingAnimation size={60} fillLevel={75} isAnimating={true} />
                </div>
              </div>

              <div className="success-content">
                <h2>{t('request_sent')}</h2>
                <p>{t('hospitals_notified')}</p>
                <div className="request-details">
                  <p><strong>{t('request_id')}:</strong> {requestId}</p>
                  <p><strong>{t('estimated_response')}:</strong> 15-30 {t('minutes')}</p>
                </div>

                <AnimatedButton
                  variant="success"
                  onClick={() => {
                    setStep('form');
                    setFormData({
                      requesterName: '',
                      requesterPhone: '',
                      bloodType: 'O+',
                      urgency: 'normal',
                      patientCondition: '',
                      location: null
                    });
                    setErrors({});
                  }}
                  size="large"
                >
                  {t('new_request')}
                </AnimatedButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emergency Instructions */}
      <motion.div
        className="emergency-instructions"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3>{t('emergency_instructions')}</h3>
        <ul>
          <li>{t('instruction_1')}</li>
          <li>{t('instruction_2')}</li>
          <li>{t('instruction_3')}</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default EmergencyBloodRequest;