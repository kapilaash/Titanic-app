# ai_copilot.py
import os
import requests
import pandas as pd
import numpy as np
import re
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import time
from huggingface_hub import InferenceClient

class TitanicAICopilot:
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.current_context = "dashboard"
        self.conversation_history = []
        self.hf_token = os.getenv('HUGGINGFACE_TOKEN')
        
        # Initialize Hugging Face client if token exists
        if self.hf_token:
            print(f"✅ HuggingFace token available: {self.hf_token[:10]}...")
            self.hf_client = InferenceClient(api_key=self.hf_token)
            self.hf_enabled = True
        else:
            print("⚠️ WARNING: No HuggingFace token found!")
            print("   AI will use enhanced fallback responses only")
            self.hf_client = None
            self.hf_enabled = False
        
        self.setup_knowledge_base()
        self.setup_app_guide()
        print("🤖 Titanic AI Copilot initialized with Hugging Face!")
        print(f"   AI Mode: {'ENABLED' if self.hf_enabled else 'FALLBACK ONLY'}")
    
    def setup_knowledge_base(self):
        """Calculate REAL statistics from your dataset"""
        # Overall stats
        self.stats = {
            'overall': {
                'passengers': len(self.df),
                'survival_rate': float(self.df['Survived'].mean() * 100),
                'average_age': float(self.df['Age'].mean()),
                'average_fare': float(self.df['Fare'].mean()),
                'male_count': int(len(self.df[self.df['Sex'] == 'male'])),
                'female_count': int(len(self.df[self.df['Sex'] == 'female'])),
                'first_class': int(len(self.df[self.df['Pclass'] == 1])),
                'second_class': int(len(self.df[self.df['Pclass'] == 2])),
                'third_class': int(len(self.df[self.df['Pclass'] == 3]))
            },
            'survival_by': {
                'class': {
                    1: float(self.df[self.df['Pclass'] == 1]['Survived'].mean() * 100),
                    2: float(self.df[self.df['Pclass'] == 2]['Survived'].mean() * 100),
                    3: float(self.df[self.df['Pclass'] == 3]['Survived'].mean() * 100)
                },
                'gender': {
                    'male': float(self.df[self.df['Sex'] == 'male']['Survived'].mean() * 100),
                    'female': float(self.df[self.df['Sex'] == 'female']['Survived'].mean() * 100)
                }
            },
            'model_info': {
                'accuracy': 84.3,
                'top_features': ['Pclass', 'Sex', 'Fare', 'Age', 'Title'],
                'model_type': 'Random Forest',
                'test_size': 179,
                'train_size': 712
            }
        }
        
        # Calculate age group survival
        try:
            age_groups = pd.cut(self.df['Age'], bins=[0, 12, 18, 30, 50, 100],
                               labels=['Children (0-12)', 'Teens (13-18)', 
                                       'Young Adults (19-30)', 'Adults (31-50)', 
                                       'Seniors (50+)'])
            self.stats['age_groups'] = {
                group: float(self.df[age_groups == group]['Survived'].mean() * 100)
                for group in age_groups.cat.categories
            }
        except:
            self.stats['age_groups'] = {}
        
        # Family stats
        self.df['FamilySize'] = self.df['SibSp'] + self.df['Parch'] + 1
        self.stats['family'] = {
            'alone_survival': float(self.df[self.df['FamilySize'] == 1]['Survived'].mean() * 100),
            'with_family_survival': float(self.df[self.df['FamilySize'] > 1]['Survived'].mean() * 100),
            'alone_count': int(len(self.df[self.df['FamilySize'] == 1]))
        }
        
        # Calculate survival by embarked
        if 'Embarked' in self.df.columns:
            embarked_stats = {}
            for port in ['C', 'Q', 'S']:
                if port in self.df['Embarked'].values:
                    embarked_stats[port] = float(self.df[self.df['Embarked'] == port]['Survived'].mean() * 100)
            self.stats['survival_by']['embarked'] = embarked_stats
    
    def setup_app_guide(self):
        """Guide for navigating the app"""
        self.app_features = {
            'dashboard': {
                'description': 'Overview with key metrics and survival analysis',
                'key_metrics': ['Total Passengers', 'Survival Rate', 'Average Age', 'Average Fare'],
                'suggestions': [
                    'Check the survival analysis charts below',
                    'Look at key metrics for quick insights',
                    'Try switching to Analysis tab for deeper insights'
                ]
            },
            'analysis': {
                'description': 'Detailed feature analysis and correlation studies',
                'features': ['Correlation Heatmap', 'Survival Analysis', 'Feature Relationships'],
                'suggestions': [
                    'Hover over the correlation heatmap to see relationships',
                    'Check survival rates by different features',
                    'Compare male vs female survival patterns'
                ]
            },
            'regression': {
                'description': 'Machine learning predictions and model insights',
                'capabilities': ['Predict Survival', 'View Model Accuracy', 'Feature Importance'],
                'suggestions': [
                    'Try making a survival prediction',
                    'Check the model accuracy score',
                    'Look at feature importance to see what mattered most'
                ]
            },
            'data': {
                'description': 'Interactive data explorer with filtering and searching',
                'features': ['Browse Passengers', 'Filter Data', 'Sort Columns', 'View Details'],
                'suggestions': [
                    'Try filtering by passenger class',
                    'Sort by age to find youngest/oldest passengers',
                    'Search for specific passengers'
                ]
            }
        }
    
    def query_huggingface(self, prompt: str, max_retries: int = 2) -> str:
        """Call Hugging Face API with the new chat/completions endpoint"""
        if not self.hf_enabled or not self.hf_client:
            return ""
        
        try:
            print(f"🤖 Calling HuggingFace chat API...")
            completion = self.hf_client.chat.completions.create(
                model="google/gemma-2-2b-it",  # Using the working chat model
                messages=[
                    {"role": "system", "content": "You are an expert Titanic data analyst. Provide concise, accurate answers based on the given context."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=250,
                temperature=0.7
            )
            
            if completion and completion.choices:
                generated_text = completion.choices[0].message.content
                print(f"✅ HuggingFace response received: {generated_text[:100]}...")
                return generated_text.strip()
            else:
                print("⚠️ HuggingFace returned empty response")
                return ""
                
        except Exception as e:
            print(f"❌ HuggingFace API error: {e}")
            # Fallback to text generation if chat fails
            try:
                response = self.hf_client.text_generation(
                    model="google/flan-t5-base",
                    prompt=f"Answer concisely: {prompt}",
                    max_new_tokens=150
                )
                return response.strip()
            except Exception as e2:
                print(f"❌ Text generation also failed: {e2}")
                return ""
    
    def generate_context_prompt(self, question: str) -> str:
        """Create a detailed prompt with Titanic context"""
        context = f"""You are an expert Titanic data analyst. Here are key facts from the dataset:

DATASET FACTS:
- Total passengers: {self.stats['overall']['passengers']}
- Overall survival rate: {self.stats['overall']['survival_rate']:.1f}%
- Average age: {self.stats['overall']['average_age']:.1f} years
- Average fare: ${self.stats['overall']['average_fare']:.2f}
- Male passengers: {self.stats['overall']['male_count']}
- Female passengers: {self.stats['overall']['female_count']}
- First class: {self.stats['overall']['first_class']}, Second: {self.stats['overall']['second_class']}, Third: {self.stats['overall']['third_class']}

SURVIVAL RATES:
- By class: 1st: {self.stats['survival_by']['class'][1]:.1f}%, 2nd: {self.stats['survival_by']['class'][2]:.1f}%, 3rd: {self.stats['survival_by']['class'][3]:.1f}%
- By gender: Female: {self.stats['survival_by']['gender']['female']:.1f}%, Male: {self.stats['survival_by']['gender']['male']:.1f}%
- Children (0-12): {self.stats['age_groups'].get('Children (0-12)', 0):.1f}% survival
- Alone passengers: {self.stats['family']['alone_survival']:.1f}% survival

ML MODEL:
- Type: {self.stats['model_info']['model_type']}
- Accuracy: {self.stats['model_info']['accuracy']}%
- Top features: {', '.join(self.stats['model_info']['top_features'])}
- Training samples: {self.stats['model_info']['train_size']}
- Testing samples: {self.stats['model_info']['test_size']}

APP CONTEXT: User is in the {self.current_context} section which shows: {self.app_features[self.current_context]['description']}

USER QUESTION: {question}

Provide a helpful, accurate answer based on the data above. If you don't know, suggest what the user can explore. Keep it concise and friendly."""
        
        return context
    
    def get_quick_answer(self, question: str) -> Optional[Dict]:
        """Check for common questions first"""
        question_lower = question.lower()
        
        # Model accuracy questions
        if any(word in question_lower for word in ['accuracy', 'model score', 'how accurate', 'precision', 'model performance']):
            return {
                'type': 'model_info',
                'response': f"**Model Accuracy:** {self.stats['model_info']['accuracy']}%\n\n**Details:**\n• Model Type: {self.stats['model_info']['model_type']}\n• Training Samples: {self.stats['model_info']['train_size']}\n• Testing Samples: {self.stats['model_info']['test_size']}\n• Top Features: {', '.join(self.stats['model_info']['top_features'])}\n\nVisit the ML Insights section for detailed predictions.",
                'confidence': 'high'
            }
        
        # Feature importance questions
        elif any(word in question_lower for word in ['feature', 'important', 'factors', 'what matters', 'key factor', 'most important']):
            features = self.stats['model_info']['top_features']
            feature_descriptions = {
                'Pclass': 'Passenger class (1st, 2nd, 3rd) - Most important factor',
                'Sex': 'Gender (male/female) - Women had much higher survival',
                'Fare': 'Ticket price - Higher fares correlated with survival',
                'Age': 'Passenger age - Children had better survival',
                'Title': 'Title from name (Mr, Mrs, Miss, etc.) - Social status indicator'
            }
            
            response_lines = ["**Most Important Factors for Survival:**"]
            for i, feature in enumerate(features, 1):
                desc = feature_descriptions.get(feature, feature)
                response_lines.append(f"{i}. **{feature}**: {desc}")
            
            response_lines.append(f"\nThese were identified by the {self.stats['model_info']['model_type']} model with {self.stats['model_info']['accuracy']}% accuracy.")
            
            return {
                'type': 'feature_analysis',
                'response': '\n'.join(response_lines),
                'confidence': 'high'
            }
        
        # Heatmap questions
        elif any(word in question_lower for word in ['heatmap', 'correlation', 'relationships', 'matrix']):
            return {
                'type': 'analysis',
                'response': f"The heatmap shows correlations between different features in the Titanic dataset.\n\n**Key insights:**\n• **Strong positive correlation with survival:** Female gender (+0.54)\n• **Strong negative correlation:** Lower passenger class (-0.34)\n• **Moderate correlation:** Higher fare price (+0.26)\n• **Weak correlation:** Age (-0.08)\n\nIn the Analysis section, you can see the visual heatmap showing these relationships.",
                'confidence': 'high'
            }
        
        # Prediction questions
        elif any(word in question_lower for word in ['predict', 'prediction', 'what if', 'would survive', 'survive if']):
            if 'female' in question_lower and ('first' in question_lower or '1st' in question_lower):
                female_rate = self.stats['survival_by']['gender']['female']
                first_class_rate = self.stats['survival_by']['class'][1]
                predicted_rate = (female_rate + first_class_rate) / 2
                
                return {
                    'type': 'prediction',
                    'response': f"**Prediction for female in 1st class:**\n\n• **Survival probability: {predicted_rate:.1f}%**\n\n**Why?**\n- Female survival rate: {female_rate:.1f}%\n- First class survival rate: {first_class_rate:.1f}%\n- Women in first class had the highest survival rates\n\n*Based on historical data analysis*",
                    'confidence': 'high'
                }
            elif 'male' in question_lower and ('third' in question_lower or '3rd' in question_lower):
                male_rate = self.stats['survival_by']['gender']['male']
                third_class_rate = self.stats['survival_by']['class'][3]
                predicted_rate = (male_rate + third_class_rate) / 2
                
                return {
                    'type': 'prediction',
                    'response': f"**Prediction for male in 3rd class:**\n\n• **Survival probability: {predicted_rate:.1f}%**\n\n**Why?**\n- Male survival rate: {male_rate:.1f}%\n- Third class survival rate: {third_class_rate:.1f}%\n- Men in third class had the lowest survival rates\n\n*Based on historical data analysis*",
                    'confidence': 'high'
                }
            else:
                # Generic prediction guidance
                return {
                    'type': 'prediction',
                    'response': "I can make survival predictions based on passenger characteristics!\n\n**Try asking:**\n• 'Predict for female in 1st class'\n• 'Predict for male in 3rd class'\n• 'What are survival chances for a child?'\n\nOr visit the ML Insights section for interactive predictions.",
                    'confidence': 'medium'
                }
        
        # Statistics questions
        elif 'show' in question_lower and ('statistics' in question_lower or 'stats' in question_lower):
            survived_count = int(self.stats['overall']['passengers'] * self.stats['overall']['survival_rate'] / 100)
            return {
                'type': 'statistics',
                'response': f"**Key Titanic Statistics:**\n\n• **Total passengers:** {self.stats['overall']['passengers']}\n• **Overall survival:** {self.stats['overall']['survival_rate']:.1f}% ({survived_count} survivors)\n• **Average age:** {self.stats['overall']['average_age']:.1f} years\n• **Average fare:** ${self.stats['overall']['average_fare']:.2f}\n• **Female survival:** {self.stats['survival_by']['gender']['female']:.1f}%\n• **Male survival:** {self.stats['survival_by']['gender']['male']:.1f}%\n• **First class:** {self.stats['survival_by']['class'][1]:.1f}% survival\n• **Model accuracy:** {self.stats['model_info']['accuracy']}%",
                'confidence': 'high'
            }
        
        # Survival rate questions
        elif any(word in question_lower for word in ['survival rate', 'survived', 'survival']):
            if 'overall' in question_lower or 'total' in question_lower:
                survived_count = int(self.stats['overall']['passengers'] * self.stats['overall']['survival_rate'] / 100)
                return {
                    'type': 'statistics',
                    'response': f"**Overall Survival Rate:** {self.stats['overall']['survival_rate']:.1f}%\n\nThat's **{survived_count} survivors** out of {self.stats['overall']['passengers']} total passengers.",
                    'confidence': 'high'
                }
            elif 'class' in question_lower or 'pclass' in question_lower:
                rates = self.stats['survival_by']['class']
                return {
                    'type': 'statistics',
                    'response': f"**Survival by Passenger Class:**\n\n• **First Class:** {rates[1]:.1f}% survival\n• **Second Class:** {rates[2]:.1f}% survival\n• **Third Class:** {rates[3]:.1f}% survival\n\nFirst class passengers had {rates[1]/rates[3]:.1f}x higher survival than third class.",
                    'confidence': 'high'
                }
            elif 'female' in question_lower or 'women' in question_lower or 'woman' in question_lower:
                female_rate = self.stats['survival_by']['gender']['female']
                male_rate = self.stats['survival_by']['gender']['male']
                return {
                    'type': 'statistics',
                    'response': f"**Female Survival Rate:** {female_rate:.1f}%\n**Male Survival Rate:** {male_rate:.1f}%\n\nFemale passengers were **{female_rate/male_rate:.1f}x more likely** to survive than male passengers.",
                    'confidence': 'high'
                }
        
        # Passenger count questions
        elif any(word in question_lower for word in ['how many', 'total passengers', 'number of', 'count']):
            if 'children' in question_lower or 'child' in question_lower:
                children = len(self.df[self.df['Age'] < 18])
                return {
                    'type': 'statistics',
                    'response': f"There were **{children} children** (under 18 years old) on board the Titanic.",
                    'confidence': 'high'
                }
            elif 'first class' in question_lower:
                return {
                    'type': 'statistics',
                    'response': f"There were **{self.stats['overall']['first_class']} first class passengers** on board.",
                    'confidence': 'high'
                }
        
        # Average questions
        elif 'average age' in question_lower:
            return {
                'type': 'statistics',
                'response': f"The **average age** of passengers was **{self.stats['overall']['average_age']:.1f} years**.",
                'confidence': 'high'
            }
        
        # App navigation questions
        elif any(word in question_lower for word in ['what can i do', 'how to use', 'help', 'guide', 'tour']):
            current_section = self.app_features[self.current_context]
            suggestions_text = '\n'.join(['• ' + s for s in current_section.get('suggestions', [])])
            return {
                'type': 'navigation',
                'response': f"**You're in the {self.current_context.capitalize()} section!**\n\n{current_section['description']}\n\n**What you can do here:**\n{suggestions_text}\n\nTry exploring the charts and data visualizations!",
                'confidence': 'high'
            }
        
        return None
    
    def answer_question(self, question: str) -> Dict:
        """Main method to answer questions with Hugging Face integration"""
        print(f"🤖 Processing question: {question}")
        
        # First try quick answers from knowledge base
        quick_answer = self.get_quick_answer(question)
        if quick_answer:
            print(f"✅ Quick answer found: {quick_answer['type']}")
            return quick_answer
        
        # If HuggingFace is enabled, use AI for complex questions
        if self.hf_enabled:
            print("🤖 Using HuggingFace AI for response...")
            try:
                prompt = self.generate_context_prompt(question)
                ai_response = self.query_huggingface(prompt)
                
                if ai_response and ai_response.strip():
                    return {
                        'type': 'ai_response',
                        'response': ai_response,
                        'confidence': 'medium',
                        'source': 'AI Analysis'
                    }
                else:
                    print("⚠️ AI returned empty, using enhanced fallback")
                    
            except Exception as e:
                print(f"❌ AI processing failed: {e}")
        
        # Fallback responses if AI fails or is disabled
        print("🔄 Using enhanced fallback response")
        fallback_responses = [
            f"I can help you analyze the Titanic dataset! Based on the data:\n\n• Overall survival: {self.stats['overall']['survival_rate']:.1f}%\n• Female survival: {self.stats['survival_by']['gender']['female']:.1f}%\n• First class survival: {self.stats['survival_by']['class'][1]:.1f}%\n\nTry asking about specific survival rates or passenger statistics!",
            f"The Titanic dataset shows interesting patterns:\n\n• {self.stats['overall']['passengers']} total passengers\n• Average age: {self.stats['overall']['average_age']:.1f} years\n• Model accuracy: {self.stats['model_info']['accuracy']}%\n\nWhat specific aspect would you like to explore?",
            f"In the {self.current_context} section, you can explore:\n\n{self.app_features[self.current_context]['description']}\n\nTry asking about survival rates by class or gender for detailed insights!"
        ]
        
        import random
        return {
            'type': 'fallback',
            'response': random.choice(fallback_responses),
            'confidence': 'medium'
        }
    
    def predict_survival(self, passenger_info: Dict) -> Dict:
        """Predict survival based on passenger details"""
        print(f"🤖 Predicting survival for: {passenger_info}")
        
        # Extract features
        sex = passenger_info.get('Sex', 'female')
        pclass = passenger_info.get('Pclass', 1)
        age = passenger_info.get('Age', 30)
        fare = passenger_info.get('Fare', 50)
        
        # Base probability from actual statistics
        base_rate = 50.0
        
        # Adjust based on actual survival rates
        if sex == 'female':
            base_rate += (self.stats['survival_by']['gender']['female'] - 50)
        else:
            base_rate += (self.stats['survival_by']['gender']['male'] - 50)
        
        if pclass == 1:
            base_rate += (self.stats['survival_by']['class'][1] - 50)
        elif pclass == 2:
            base_rate += (self.stats['survival_by']['class'][2] - 50)
        elif pclass == 3:
            base_rate += (self.stats['survival_by']['class'][3] - 50)
        
        # Age adjustment
        if age < 12:
            base_rate += 15  # Children had better chances
        elif age > 60:
            base_rate -= 10  # Elderly had lower chances
        
        # Fare adjustment
        if fare > 100:
            base_rate += 10
        elif fare < 10:
            base_rate -= 5
        
        # Clamp between 5-95%
        probability = max(5, min(95, base_rate))
        prediction = 1 if probability > 50 else 0
        
        # Generate insights
        insights = []
        if sex == 'female':
            insights.append(f"Women had {self.stats['survival_by']['gender']['female']:.1f}% survival rate")
        else:
            insights.append(f"Men had {self.stats['survival_by']['gender']['male']:.1f}% survival rate")
        
        if pclass == 1:
            insights.append(f"First class: {self.stats['survival_by']['class'][1]:.1f}% survival")
        elif pclass == 3:
            insights.append(f"Third class: {self.stats['survival_by']['class'][3]:.1f}% survival")
        
        if age < 12:
            insights.append("Children were prioritized during evacuation")
        
        return {
            'prediction': prediction,
            'probability': round(probability, 1),
            'confidence': 'high' if abs(probability - 50) > 30 else 'medium',
            'insights': insights,
            'note': 'Based on historical survival patterns. For exact ML prediction, use the ML Insights section.'
        }
    
    def set_context(self, context: str):
        """Update current app context"""
        if context in self.app_features:
            self.current_context = context
            print(f"📱 Context updated to: {context}")
        else:
            print(f"⚠️ Invalid context: {context}, keeping {self.current_context}")
    
    def get_suggestions(self) -> List[str]:
        """Get suggested questions based on context"""
        suggestions = {
            'dashboard': [
                "What was the overall survival rate?",
                "How many passengers were in first class?",
                "What's the average age of passengers?",
                "Show survival by gender",
                "How many children were on board?"
            ],
            'analysis': [
                "What's the strongest correlation?",
                "How does class affect survival?",
                "Show male vs female survival comparison",
                "What factors affect survival most?",
                "Analyze survival by age groups"
            ],
            'regression': [
                "What's the model accuracy?",
                "Predict survival for female in 1st class",
                "Which features are most important?",
                "How accurate are the predictions?",
                "Make a survival prediction"
            ],
            'data': [
                "Find the youngest passenger",
                "Show all first class passengers",
                "How many children were on board?",
                "Filter by survival status",
                "Find passengers by age"
            ]
        }
        
        return suggestions.get(self.current_context, [
            "What was the overall survival rate?",
            "How did gender affect survival?",
            "What's the model accuracy?",
            "Predict survival for a specific passenger"
        ])
    
    def get_quick_actions(self, context: str) -> List[Dict]:
        """Get quick actions for the frontend"""
        actions = {
            'dashboard': [
                {'icon': '📊', 'label': 'View Stats', 'action': 'ask:Show survival statistics'},
                {'icon': '📈', 'label': 'Go to Analysis', 'action': 'navigate:analysis'},
                {'icon': '🤖', 'label': 'Try Prediction', 'action': 'navigate:regression'},
                {'icon': '🔍', 'label': 'Explore Data', 'action': 'navigate:data'}
            ],
            'analysis': [
                {'icon': '🔥', 'label': 'Explain Heatmap', 'action': 'ask:What does the heatmap show'},
                {'icon': '👥', 'label': 'Class Analysis', 'action': 'ask:Show survival by class'},
                {'icon': '⚡', 'label': 'Quick Predict', 'action': 'ask:Predict for female in 1st class'},
                {'icon': '🏠', 'label': 'Back to Dashboard', 'action': 'navigate:dashboard'}
            ],
            'regression': [
                {'icon': '🎯', 'label': 'Make Prediction', 'action': 'open_predictor'},
                {'icon': '📊', 'label': 'View Accuracy', 'action': 'ask:What is the model accuracy'},
                {'icon': '🔑', 'label': 'Key Factors', 'action': 'ask:What factors are most important'},
                {'icon': '📈', 'label': 'Go to Analysis', 'action': 'navigate:analysis'}
            ],
            'data': [
                {'icon': '🔍', 'label': 'Search Passengers', 'action': 'focus_search'},
                {'icon': '📋', 'label': 'Filter by Class', 'action': 'filter:pclass:1'},
                {'icon': '📊', 'label': 'Back to Stats', 'action': 'navigate:dashboard'},
                {'icon': '🤖', 'label': 'Ask AI', 'action': 'open_chat'}
            ]
        }
        
        return actions.get(context, actions['dashboard'])