package com.ngoconnect.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF for REST API (session cookie is used for auth)
                .csrf(AbstractHttpConfigurer::disable)
                // Allow H2 console frames
                .headers(h -> h.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .authenticationProvider(authenticationProvider())
                .authorizeHttpRequests(auth -> auth
                        // Public pages and static resources
                        .requestMatchers("/", "/index.html", "/login.html", "/signup.html").permitAll()
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/uploads/**").permitAll()
                        .requestMatchers("/*.html").permitAll()
                        // H2 console
                        .requestMatchers("/h2-console/**").permitAll()
                        // Auth endpoints
                        .requestMatchers("/api/auth/**").permitAll()
                        // Public read access
                        .requestMatchers(HttpMethod.GET, "/api/donations/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/requirements/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/campaigns/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/disaster/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/carecenters/**").permitAll()
                        // Payment & Razorpay endpoints
                        .requestMatchers("/api/payment/**").permitAll()
                        // Admin only
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Everything else requires auth
                        .anyRequest().authenticated())
                // Return 401 JSON instead of redirect for API calls
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("{\"status\":401,\"message\":\"Please log in to continue\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write("{\"status\":403,\"message\":\"Access denied\"}");
                        }));

        return http.build();
    }
}
