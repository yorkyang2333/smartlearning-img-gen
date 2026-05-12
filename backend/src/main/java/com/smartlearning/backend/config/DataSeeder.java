package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            // Create default Teacher
            User teacher = new User();
            teacher.setUsername("teacher");
            teacher.setPassword(passwordEncoder.encode("123456"));
            teacher.setDisplayName("王老师 (Teacher)");
            teacher.setRole("TEACHER");
            teacher.setIsActive(true);
            userRepository.save(teacher);

            // Create default Student
            User student = new User();
            student.setUsername("student");
            student.setPassword(passwordEncoder.encode("123456"));
            student.setDisplayName("小明 (Student)");
            student.setRole("STUDENT");
            student.setTeacherId(teacher.getId());
            student.setIsActive(true);
            userRepository.save(student);

            System.out.println("✅ 已自动创建测试账号：");
            System.out.println("教师账号 - 用户名: teacher, 密码: 123456");
            System.out.println("学生账号 - 用户名: student, 密码: 123456");
        }
    }
}
