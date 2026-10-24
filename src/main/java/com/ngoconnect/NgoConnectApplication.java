package com.ngoconnect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NgoConnectApplication {
    public static void main(String[] args) {
        SpringApplication.run(NgoConnectApplication.class, args);
    }
}
