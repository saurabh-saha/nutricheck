const DEFAULT_RECOMMENDED_CALORIES = 2000;
const CALORIE_THRESHOLD_RATIO = 0.6;

const scheduleConfig = {
  10: {
    bucket: "morning",
    checkFnName: "shouldSendMorning",
    subject: "Time to log your nutrition",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #0f172a; color: #f1f5f9; padding: 20px; border-radius: 12px;">
                
        <header style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 2.5rem;">🥗</span>
          <h1 style="font-size: 1.8rem; font-weight: bold; margin: 0; color: #ffffff;">NutriCheck</h1>
        </header>
        
        <p style="font-size: 1rem;">Good morning! ☀️ Looks like you didn’t log your intake yesterday. Let’s start today fresh and keep your health on track!</p>
        <p style="font-style: italic; color: #94a3b8;">Remember, consistency is key for your nutrition goals.</p>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://dapper-chimera-ceea66.netlify.app/" 
             style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
             Open NutriCheck
          </a>
        </div>
        
        <footer style="margin-top: 30px; font-size: 0.85rem; color: #64748b; text-align: center;">
          &copy; 2025 NutriCheck. Built with <span style="color: #3b82f6;">💙</span>
        </footer>
      </div>
    `,
    dateToCheck: (today, yesterday) => yesterday,
  },
  20: {
    bucket: "evening",
    checkFnName: "shouldSendEvening",
    subject: "You’re running low on fuel 🔋",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #0f172a; color: #f1f5f9; padding: 20px; border-radius: 12px;">
        
        <header style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 2.5rem;">🥗</span>
          <h1 style="font-size: 1.8rem; font-weight: bold; margin: 0; color: #ffffff;">NutriCheck</h1>
        </header>
        
        <p style="font-size: 1rem;">Hey there! It seems like you’re running low on calories or nutrients today. Let’s fuel up and keep going strong! 💪</p>
        <p style="font-style: italic; color: #94a3b8;">Tracking your nutrition helps you stay energized and healthy.</p>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://dapper-chimera-ceea66.netlify.app/" 
             style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
             Open NutriCheck
          </a>
        </div>
        
        <footer style="margin-top: 30px; font-size: 0.85rem; color: #64748b; text-align: center;">
          &copy; 2025 NutriCheck. Built with <span style="color: #3b82f6;">💙</span>
        </footer>
      </div>
    `,
    dateToCheck: (today, yesterday) => today,
  },
};




module.exports = {
  DEFAULT_RECOMMENDED_CALORIES,
  CALORIE_THRESHOLD_RATIO,
  scheduleConfig,
};
