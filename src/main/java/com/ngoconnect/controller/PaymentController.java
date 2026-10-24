package com.ngoconnect.controller;

import com.ngoconnect.dto.RazorpayDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.service.AuthService;
import com.ngoconnect.service.RazorpayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final RazorpayService razorpayService;
    private final AuthService authService;

    @GetMapping("/config")
    public ResponseEntity<RazorpayDto.ConfigResponse> getConfig() {
        return ResponseEntity.ok(razorpayService.getConfig());
    }

    @PostMapping("/create-order")
    public ResponseEntity<RazorpayDto.CreateOrderResponse> createOrder(
            @RequestBody RazorpayDto.CreateOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User contributor = userDetails != null ? authService.findByEmail(userDetails.getUsername()) : null;
        return ResponseEntity.ok(razorpayService.createOrder(request, contributor));
    }

    @PostMapping("/verify")
    public ResponseEntity<RazorpayDto.PaymentVerificationResponse> verifyPayment(
            @RequestBody RazorpayDto.VerifyPaymentRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User contributor = userDetails != null ? authService.findByEmail(userDetails.getUsername()) : null;
        return ResponseEntity.ok(razorpayService.verifyAndRecordDonation(request, contributor));
    }
}
