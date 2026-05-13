package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.util.ModelConfigUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private TutorConfigRepository tutorConfigRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            // Create default Teacher
            User teacher = new User();
            teacher.setUsername("teacher");
            teacher.setPasswordHash(passwordEncoder.encode("123456"));
            teacher.setDisplayName("王老师 (Teacher)");
            teacher.setRole("TEACHER");
            teacher.setIsActive(true);
            userRepository.save(teacher);

            // Create default Student
            User student = new User();
            student.setUsername("student");
            student.setPasswordHash(passwordEncoder.encode("123456"));
            student.setDisplayName("小明 (Student)");
            student.setRole("STUDENT");
            student.setTeacherId(teacher.getId());
            student.setIsActive(true);
            userRepository.save(student);

            System.out.println("✅ 已自动创建测试账号：");
            System.out.println("教师账号 - 用户名: teacher, 密码: 123456");
            System.out.println("学生账号 - 用户名: student, 密码: 123456");

            // Create Default Models
            modelRepository.save(createModel("DALL-E 3 (生图)", "dall-e-3", "TEXT_TO_IMAGE", "openai", "高质量AI图像生成模型"));
            modelRepository.save(createModel("GPT Image 2", "gpt-image-2", "BOTH", "openai", "优质AI图像生成与编辑"));
            modelRepository.save(createModel("Gemini 3.1 Flash Image", "gemini/gemini-3.1-flash-image-preview", "TEXT_TO_IMAGE", "google", "Google Gemini 的高速生图模型"));
            modelRepository.save(createModel("GPT-4o", "gpt-4o", "TEXT_GENERATION", "openai", "多模态分析与导师对话"));
            modelRepository.save(createModel("Claude 3.5 Sonnet", "claude-3-5-sonnet-latest", "TEXT_GENERATION", "anthropic", "长文本分析与教学反馈"));

            // Set up Default Tutor Config
            TutorConfig tutorConfig = new TutorConfig();
            tutorConfig.setTeacherId(teacher.getId());
            tutorConfig.setEnabled(true);
            tutorConfig.setModelName("gpt-4o");
            tutorConfig.setApiEndpointId(null);
            tutorConfig.setSystemPrompt("你是一个专业、耐心、富有启发性的AI美术导师。请用温和、鼓励的语气指导学生进行艺术创作。");
            tutorConfigRepository.save(tutorConfig);

            System.out.println("✅ 已自动配置默认模型目录和 AI 学伴。");
            System.out.println("⚠️ 请通过环境变量 LITELLM_BASE_URL / LITELLM_API_KEY 连接 AI Gateway 网关。");
        }
    }

    private Model createModel(String name, String modelId, String type, String provider, String desc) {
        Model m = new Model();
        m.setName(name);
        m.setModelId(modelId);
        m.setType(type);
        m.setProvider(provider);
        m.setDescription(desc);
        m.setApiFormat("openai");
        m.setConfig(("TEXT_TO_IMAGE".equals(type) || "BOTH".equals(type))
            ? ModelConfigUtil.buildImageConfigJson(modelId, m.getApiFormat())
            : "{}");
        m.setApiEndpointId(null);
        return m;
    }
}
